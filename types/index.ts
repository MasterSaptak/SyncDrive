// ==============================================================================
// SyncDrive - Core Domain & Multi-Tenant Type Definitions (Phase 1 Foundation)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Roles & Multi-Tenant Access Control
// ------------------------------------------------------------------------------
export type UserRole = 'customer' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string; // Auth User ID (UUID)
  tenantId: string; // Multi-tenancy tenant boundary
  email: string;
  fullName: string;
  role: UserRole;
  currentPlanId: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

// ------------------------------------------------------------------------------
// 2. Storage Standards & Deterministic Integer Byte Constants
// Standard convention: Binary standard (1 GiB = 1,073,741,824 bytes, 2^30)
// Bigint / integer-safe storage representation, no floating point calculations.
// ------------------------------------------------------------------------------
export const BYTES_PER_KIB = 1024;
export const BYTES_PER_MIB = 1024 * 1024;
export const BYTES_PER_GIB = 1024 * 1024 * 1024; // 1,073,741,824 bytes
export const BYTES_PER_TIB = 1024 * 1024 * 1024 * 1024; // 1,099,511,627,776 bytes

export interface StoragePlan {
  id: string;
  slug: string;
  name: string;
  quotaBytes: number; // Deterministic integer bytes (e.g. 100 * BYTES_PER_GIB)
  monthlyPrice: number; // In base currency units (e.g. INR 199)
  monthlyPriceInr?: number; // Backward compatibility alias
  currency: string; // 'INR', 'USD', etc.
  isActive: boolean;
  displayOrder: number;
  description: string;
  features: string[];
  isPopular?: boolean;
}

// ------------------------------------------------------------------------------
// 3. Subscriptions & Storage Entitlement
// Note: System explicitly distinguishes between subscription status and storage entitlement.
// ------------------------------------------------------------------------------
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'suspended';

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  storageEntitlementBytes: number; // Active entitlement in bytes regardless of pending billing
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StorageAllocationType = 'plan_quota' | 'addon' | 'bonus' | 'trial';

export interface StorageAllocation {
  id: string;
  tenantId: string;
  userId: string;
  allocatedBytes: number;
  allocationType: StorageAllocationType;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageUsage {
  id: string;
  tenantId: string;
  userId: string;
  usedBytes: number;
  reservedBytes: number;
  fileCount: number;
  folderCount: number;
  lastCalculatedAt: string;
}

// User-facing Quota Representation
export interface LogicalQuota {
  userId: string;
  tenantId: string;
  planId: string;
  planName: string;
  quotaBytes: number;
  usedBytes: number;
  reservedBytes: number;
  availableBytes: number;
  subscriptionStatus: SubscriptionStatus;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 4. Physical Storage Abstraction & Pooled Providers
// ------------------------------------------------------------------------------
export type StorageProviderType =
  | 'google_drive'
  | 'local_memory'
  | 's3_compatible'
  | 'b2'
  | 'azure_blob';

export type StorageAccountStatus = 'active' | 'read_only' | 'draining' | 'error' | 'disabled';
export type StorageAccountHealth = 'healthy' | 'degraded' | 'unhealthy';

export interface InternalStorageAccountCredentials {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  rootFolderId?: string;
}

export interface InternalStorageAccount {
  id: string; // internal storage account ID (e.g. "gdrive_acc_01")
  poolId: string; // which storage pool it belongs to
  provider: StorageProviderType;
  name: string; // operator-friendly label (e.g., "Google Storage Node A - US East")
  email?: string; // operator identifier (never sent to customer)
  status: StorageAccountStatus;
  capacityTotalBytes: number; // X: e.g. 15 * 1024 * 1024 * 1024
  capacityUsedBytes: number; // Y: currently committed bytes
  capacityReservedBytes: number; // Z: currently reserved in-flight bytes
  availableBytes: number; // X - Y - Z
  encryptedCredentialRef?: string; // reference to encrypted secrets or KMS key
  credentials?: InternalStorageAccountCredentials;
  healthStatus: StorageAccountHealth;
  lastHealthCheck: string;
  errorMessage?: string;
  rootFolderId?: string; // Physical application root folder ID on this Google Drive
  createdAt: string;
  updatedAt: string;
}

export interface StoragePool {
  id: string; // e.g. "pool_gdrive_primary"
  name: string; // e.g. "Primary Pooled Google Drive Fleet"
  provider: StorageProviderType;
  status: 'active' | 'read_only' | 'maintenance';
  accountIds: string[];
  capacityTotalBytes: number; // Sum of X across accounts in pool
  capacityUsedBytes: number; // Sum of Y across accounts in pool
  capacityReservedBytes: number; // Sum of Z across accounts in pool
  availableBytes: number; // X - Y - Z
  createdAt: string;
  updatedAt: string;
}

export interface StoragePoolMetrics {
  pool: StoragePool;
  accounts: InternalStorageAccount[];
  totalCapacityBytes: number;
  usedBytes: number;
  reservedBytes: number;
  availableBytes: number;
}

export interface PhysicalCapacityReservation {
  id: string;
  storageAccountId: string;
  poolId: string;
  reservedBytes: number;
  internalFileId: string;
  expiresAt: string;
  status: 'active' | 'committed' | 'released' | 'expired';
  createdAt: string;
}

export interface ResumableUploadSession {
  sessionToken: string;
  internalFileId: string;
  userId: string;
  tenantId: string;
  storageAccountId: string;
  storageNodeId: string;
  googleResumableUrl?: string;
  expectedSizeBytes: number;
  uploadedBytes: number;
  quotaReservationId: string;
  physicalReservationId: string;
  status: 'active' | 'completed' | 'failed' | 'aborted';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ReconciliationDiscrepancyType =
  | 'missing_physical_file'
  | 'orphaned_physical_file'
  | 'size_mismatch'
  | 'metadata_mismatch';

export interface ReconciliationItem {
  id: string;
  type: ReconciliationDiscrepancyType;
  internalFileId?: string;
  storageObjectId?: string;
  storageAccountId: string;
  filename?: string;
  dbSizeBytes?: number;
  physicalSizeBytes?: number;
  details: string;
  detectedAt: string;
}

export interface ReconciliationReport {
  id: string;
  storageAccountId: string;
  storageAccountName: string;
  totalPhysicalFilesScanned: number;
  totalDbRecordsScanned: number;
  discrepanciesCount: number;
  discrepancies: ReconciliationItem[];
  physicalUsedBytes: number;
  dbAccountingUsedBytes: number;
  byteDifference: number;
  scannedAt: string;
}

export interface StorageProviderRecord {
  id: string;
  providerType: StorageProviderType;
  name: string;
  accountIdentifier: string;
  status: 'active' | 'degraded' | 'offline';
  healthCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoragePoolRecord {
  id: string;
  name: string;
  providerId: string;
  totalCapacityBytes: number;
  usedBytes: number;
  status: 'active' | 'drain' | 'maintenance' | 'full';
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 5. Files, Folders & Versioning
// ------------------------------------------------------------------------------
export type UploadStatus = 'pending' | 'reserved' | 'uploading' | 'completed' | 'failed';

export interface FolderRecord {
  id: string;
  tenantId: string;
  userId: string;
  parentId: string | null;
  name: string;
  color?: string;
  isStarred: boolean;
  isTrash: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Internal File Record - Application owns metadata
// Internal physical storage specifics are strictly isolated and never returned to customers.
export interface InternalFileRecord {
  id: string; // Internal UUID
  tenantId?: string; // Multi-tenant boundary
  userId: string;
  parentId: string | null;
  name: string;
  sizeBytes: number;
  mimeType: string;
  checksumSha256?: string;
  isFolder: boolean;
  isStarred?: boolean;
  isTrash: boolean;
  deletedAt: string | null;
  storageProvider: StorageProviderType;
  storageObjectId: string; // Internal object ID (Google Drive file ID, etc.)
  storageAccountId?: string; // Physical storage account ID (internal only)
  storageNodeId?: string; // Pool node identifier
  uploadStatus: UploadStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileVersionRecord {
  id: string;
  fileId: string;
  tenantId: string;
  versionNumber: number;
  sizeBytes: number;
  checksumSha256?: string;
  storageObjectId: string;
  storageProvider: StorageProviderType;
  createdBy: string;
  createdAt: string;
}

// Public-safe File Item - Internal provider details stripped
export interface PublicFileItem {
  id: string;
  tenantId?: string;
  parentId: string | null;
  name: string;
  sizeBytes: number;
  mimeType: string;
  checksumSha256?: string;
  isFolder: boolean;
  isStarred?: boolean;
  isTrash: boolean;
  deletedAt: string | null;
  version: number;
  uploadStatus: UploadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadReservation {
  id: string;
  tenantId: string;
  userId: string;
  expectedSizeBytes: number;
  storageNodeId?: string;
  expiresAt: string;
  status: 'active' | 'committed' | 'released' | 'expired';
  createdAt: string;
}

// ------------------------------------------------------------------------------
// 6. Share Links
// ------------------------------------------------------------------------------
export interface ShareLink {
  id: string;
  tenantId?: string;
  fileId: string;
  fileName: string;
  userId: string;
  token: string;
  accessType: 'view' | 'download' | 'edit';
  expiresAt?: string;
  hasPassword: boolean;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// 7. Payments & Billing Abstraction
// ------------------------------------------------------------------------------
export type BillingGateway = 'manual_upi' | 'razorpay' | 'stripe';
export type PaymentStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentSubmission {
  id: string;
  tenantId: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  amountInr?: number;
  currency: string;
  method: 'manual_upi';
  referenceId: string; // 12-digit UTR/Ref
  upiReferenceId?: string;
  payerVpa?: string;
  payeeVpa: string;
  status: PaymentStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
}

// Backward compatibility alias for UI
export type ManualUPIPayment = PaymentSubmission;

export interface PaymentRecord {
  id: string;
  tenantId: string;
  userId: string;
  subscriptionId?: string;
  planId: string;
  gateway: BillingGateway;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 8. Audit Logs
// ------------------------------------------------------------------------------
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: 'file' | 'folder' | 'quota' | 'subscription' | 'share' | 'auth' | 'payment';
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ------------------------------------------------------------------------------
// 9. Authentication Data Contracts
// ------------------------------------------------------------------------------
export type AuthProviderType = 'email' | 'google' | 'github' | 'saml';

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}
