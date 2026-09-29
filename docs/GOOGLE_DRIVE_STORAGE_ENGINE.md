# Google Drive Storage Engine Architecture (Phase 2)

## 1. Overview & Architectural Isolation

The Google Drive Storage Engine serves as the physical storage subsystem for SyncDrive SaaS. It is entirely abstracted behind the `StorageProvider` interface (`lib/storage/StorageProvider.ts`).

### Strict Customer Isolation
- **Logical vs. Physical Separation**: Customers interact solely with our logical filesystem hierarchy (`PublicFileItem`). All customer-facing folder trees, file names, paths, permissions, versions, and trash states are maintained authoritatively in the application database.
- **Credential Privacy**: Customers are never aware of, nor do they ever interact directly with, Google Drive or OAuth tokens. Physical identifiers (`storageAccountId`, `storageObjectId`, `storageNodeId`, physical folder IDs, credentials) are strictly stripped from all customer-facing API responses.
- **Multi-Node Fleet**: The physical layer manages a pool of application-owned Google Drive storage accounts, balancing capacity dynamically across nodes.

```
+-------------------------------------------------------------------+
|                        Customer Web UI                           |
|       (Logical folder navigation, quota progress, file list)      |
+---------------------------------+---------------------------------+
                                  | HTTP /api/files/*
+---------------------------------v---------------------------------+
|                       SyncDrive API Layer                         |
|   - Authentication (Supabase / Session)                           |
|   - Customer Quota Enforcement (Logical bytes)                    |
|   - Audit Logging                                                 |
+---------------------------------+---------------------------------+
                                  |
+---------------------------------v---------------------------------+
|            Storage Allocation Service (Multi-Node Pool)           |
|   - Storage Pools (`StoragePool`)                                 |
|   - Multi-Account Selection & Capacity Load Balancing             |
|   - Physical Capacity Reservations (`PhysicalCapacityReservation`) |
+---------------------------------+---------------------------------+
                                  |
+---------------------------------v---------------------------------+
|                    StorageProvider Abstraction                    |
|                   (GoogleDriveStorageProvider)                    |
|   - Server-Side Server-to-Server OAuth 2.0 Token Refresh          |
|   - Controlled Root Folder Structure (`syncdrive_root`)           |
|   - Resumable Upload Session Manager & Chunk Streaming            |
|   - Download Stream Proxying                                      |
|   - GoogleDriveErrorTranslator (Sanitized API exceptions)         |
+---------------------------------+---------------------------------+
                                  | Google Drive API v3 (REST)
+---------------------------------v---------------------------------+
|             Google Drive Storage Accounts (Physical Nodes)        |
|      Account 1 (Tier 1 Node)         Account 2 (Tier 2 Node)      |
+-------------------------------------------------------------------+
```

---

## 2. Configuration & OAuth Scopes

### Required Google OAuth 2.0 Scopes
For application-owned service accounts or Google Cloud OAuth 2.0 credentials:
- `https://www.googleapis.com/auth/drive.file`: Recommended for production. Limits the application's access strictly to files and folders created by this application.
- `https://www.googleapis.com/auth/drive`: Full Drive scope, required if operating across pre-existing root folder structures or enterprise Shared Drives.

### OAuth 2.0 Flow for Storage Fleet Nodes
1. In Google Cloud Console, create an OAuth 2.0 Client ID (Application Type: Web Application).
2. Authorize redirect URIs for your internal operator tool.
3. Perform the one-time offline consent flow requesting `access_type=offline` and `prompt=consent` to receive a durable `refresh_token`.
4. Store the encrypted credentials in the `internal_storage_accounts` record (or server environment for default node).

---

## 3. Environment Variables

Documented in `.env.example`:

| Variable | Description | Security Level |
| :--- | :--- | :--- |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth 2.0 Client ID for default storage account node | Secret (Server Only) |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth 2.0 Client Secret for default storage account node | High Secret (Server Only) |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Offline Refresh Token used to mint access tokens | High Secret (Server Only) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Optional specific Google Drive folder ID for tenant root | Internal ID |

*Note: In multi-account production fleets, additional storage account credentials are stored encrypted in the database with KMS-managed encryption keys, never committed to git or exposed in client bundles.*

---

## 4. Controlled Folder Hierarchy

Files uploaded through SyncDrive are organized within an application-owned folder hierarchy on each Google Drive storage account:

```
[Google Drive Storage Account Root]
  └── syncdrive_root/
        ├── meta/
        └── objects/
              ├── {internalFileId}             <-- Physical raw file binary
              └── {internalFileId}
```

- Each file object on Google Drive is identified by `internalFileId` (e.g. `file_9b1deb4d-...`) rather than user file names, ensuring customer privacy and preventing collision across identical file names.
- Customer-facing directories and nesting exist purely in database metadata (`InternalFileRecord.parentId`).

---

## 5. Storage Capacity Management & Allocation Engine

The `StorageAllocationService` (`lib/services/storage-allocation.service.ts`) orchestrates multi-node capacity:

1. **Storage Pools (`StoragePool`)**:
   - Aggregate multiple physical storage accounts into a unified capacity tier (e.g., `pool_gdrive_primary`).
   - Tracks `capacityTotalBytes`, `capacityUsedBytes`, `capacityReservedBytes`, and `availableBytes`.
2. **Two-Phase Capacity Reservation**:
   - **Phase 1: Reserve (`reservePhysicalCapacity`)**: When an upload initiates, available capacity is verified and reserved on the best node (highest available capacity). A `PhysicalCapacityReservation` record is created with a 2-hour TTL.
   - **Phase 2: Commit (`commitPhysicalUsage`)**: Upon successful chunk upload and integrity verification, the reserved bytes are committed to `capacityUsedBytes`.
   - **Rollback (`rollbackPhysicalReservation`)**: If the upload is aborted or fails, reserved capacity is instantly freed.
3. **Concurrency Control**:
   - Utilizes `AsyncLock` (`lib/utils/concurrency.ts`) to prevent over-subscription and race conditions during simultaneous parallel uploads.

---

## 6. Resumable Uploads & Chunk Protocol

For large files or unreliable mobile networks, the Google Drive storage provider implements chunked resumable uploads following the Google Drive v3 Resumable Upload protocol:

1. **Initiate Session (`POST /api/files/upload/init`)**:
   - Checks logical quota and reserves physical capacity.
   - Issues `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable` with metadata.
   - Returns a server session token to the client.
2. **Chunk Upload (`POST /api/files/upload/chunk`)**:
   - Streams byte chunks with `Content-Range: bytes START-END/TOTAL`.
   - Returns HTTP 308 (Resume Incomplete) with received byte range, or HTTP 200/201 when all bytes are stored.
3. **Resume Offset Query (`GET /api/files/upload/chunk`)**:
   - Queries `Content-Range: bytes */TOTAL` on the upload URI.
   - Returns the exact byte count already committed by Google Drive, allowing interrupted uploads to resume without retransmitting uploaded bytes.
4. **Abort Session (`DELETE /api/files/upload/chunk`)**:
   - Issues a `DELETE` request to cancel the session and releases both logical quota and physical capacity reservations.

---

## 7. Error Handling Strategy & Translation

The `GoogleDriveErrorTranslator` (`lib/storage/errors/GoogleDriveErrorTranslator.ts`) intercepts all Google Drive API responses and network failures, translating them into sanitized application exceptions:

| Google API Error / Condition | Application Exception | HTTP Code | Mitigation |
| :--- | :--- | :--- | :--- |
| `storageQuotaExceeded` | `StorageAccountCapacityExceededError` | 507 | Marks account unhealthy; reroutes new uploads to alternative pool accounts |
| `rateLimitExceeded` / `userRateLimitExceeded` | `StorageRateLimitError` | 429 | Inspects `Retry-After` header; triggers exponential backoff with jitter |
| `invalid_grant` / 401 Unauthorized | `StorageAuthenticationError` | 502 | Attempts token refresh; triggers operator alerts if refresh token expired |
| `fileNotFound` / 404 | `StorageObjectNotFoundError` | 404 | Marks discrepancy for reconciliation |
| 500 / 502 / 503 / 504 | `StorageBackendUnavailableError` | 503 | Automatic retry with truncated binary exponential backoff |

**Sanitization Mandate**: Error messages delivered to customers strip all Google hostnames (`drive.google.com`, `googleapis.com`), internal account IDs, and OAuth tokens.

---

## 8. Storage Reconciliation Foundation

The `StorageReconciliationService` (`lib/storage/reconciliation/StorageReconciliationService.ts`) ensures eventual consistency between the application database and physical Google Drive accounts:

- **Missing Physical Files**: Identifies files marked as `completed` in the database whose physical object cannot be retrieved from Google Drive.
- **Orphaned Physical Files**: Identifies files stored on Google Drive that have no corresponding database record (e.g., failed commits or aborted uploads).
- **Size & Checksum Verification**: Compares physical byte lengths against database metadata.
- **Pruning**: Automated cleanup of orphaned objects older than 24 hours to prevent storage waste.

---

## 9. Operational Caveats & Production Considerations

1. **Google Drive API Rate Limits**:
   - Google enforces a per-user limit of ~20,000 queries per 100 seconds and per-file write rate limits (~1 write per second).
   - *Production mitigation*: The storage engine routes writes across multiple storage accounts and bundles metadata in the application database rather than updating Google Drive metadata frequently.
2. **Refresh Token Expiration**:
   - If an OAuth consent app is in "Testing" mode in Google Cloud Console, refresh tokens expire every 7 days.
   - *Production mitigation*: Move the OAuth consent screen status to "In production" and verify the app domain to ensure durable refresh tokens.
3. **Trash Retention**:
   - Google Drive automatically purges files in trash after 30 days. SyncDrive maintains its own logical trash lifecycle, physically deleting objects only upon permanent purge or customer account deletion.
