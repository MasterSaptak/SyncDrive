import crypto from 'crypto';
import { StorageProvider } from '../StorageProvider';
import {
  UploadBufferParams,
  UploadResult,
  ResumableSessionParams,
  ResumableSessionResult,
  UploadChunkParams,
  UploadChunkResult,
  DownloadResult,
  StorageObjectMetadata,
  StorageHealthResult,
} from '../types';
import {
  GoogleDriveErrorTranslator,
  StorageOperationError,
} from '../errors/GoogleDriveErrorTranslator';

export interface GoogleDriveConfig {
  accountId?: string;
  accountName?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  rootFolderId?: string;
}

/**
 * GoogleDriveStorageProvider
 * 
 * Physical Google Drive storage adapter supporting pooled personal or Workspace accounts.
 * - Server-side OAuth2 token refreshes (using offline refresh tokens)
 * - Managed application-owned folder hierarchy (isolated from customer logical trees)
 * - Resumable uploads via Google Drive v3 Resumable Upload protocol
 * - Resumable progress checking & interrupted upload recovery
 * - Sanitized error translation via GoogleDriveErrorTranslator
 * - In-memory simulated backing store fallback for preview/testing environments
 */
export class GoogleDriveStorageProvider implements StorageProvider {
  readonly providerType = 'google_drive';
  public readonly accountId: string;
  public readonly accountName: string;
  private config: GoogleDriveConfig;
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private verifiedAppRootId: string | null = null;

  // Shared in-flight resumable sessions across all Google Drive provider instances
  private static sharedResumableSessions = new Map<
    string,
    {
      uploadUrl: string;
      expectedSize: number;
      receivedBytes: number;
      internalFileId: string;
      mimeType: string;
      chunks: Uint8Array[];
      isMockSession?: boolean;
    }
  >();

  // Shared mock store for simulated nodes in non-live testing environments across provider instances
  private static sharedMockObjects = new Map<
    string,
    {
      id: string;
      name: string;
      buffer: Uint8Array;
      mimeType: string;
      sizeBytes: number;
      createdAt: string;
      updatedAt: string;
    }
  >();

  private get resumableSessions() {
    return GoogleDriveStorageProvider.sharedResumableSessions;
  }

  private get mockObjects() {
    return GoogleDriveStorageProvider.sharedMockObjects;
  }

  public hasSession(sessionToken: string): boolean {
    return GoogleDriveStorageProvider.sharedResumableSessions.has(sessionToken);
  }

  constructor(config?: GoogleDriveConfig) {
    this.config = config || {};
    this.accountId = this.config.accountId || 'gdrive_acc_01';
    this.accountName = this.config.accountName || 'Google Drive Storage Node';
    
    // Resolve credentials from explicit config or environment variables
    if (!this.config.clientId) this.config.clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    if (!this.config.clientSecret) this.config.clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    if (!this.config.refreshToken) this.config.refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    if (!this.config.rootFolderId) this.config.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  }

  public isConfigured(): boolean {
    return Boolean(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.refreshToken &&
      !this.config.clientId.includes('placeholder') &&
      !this.config.refreshToken.includes('placeholder')
    );
  }

  /**
   * Refreshes OAuth2 access token using stored offline refresh token.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    if (!this.isConfigured()) {
      throw new StorageOperationError(
        'Google Drive backend credentials missing for storage account.',
        'STORAGE_CREDENTIALS_MISSING',
        500
      );
    }

    try {
      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      const body = new URLSearchParams({
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        refresh_token: this.config.refreshToken!,
        grant_type: 'refresh_token',
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'REFRESH_ACCESS_TOKEN',
          accountId: this.accountId,
        });
      }

      const data = await response.json();
      this.cachedAccessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return this.cachedAccessToken!;
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'REFRESH_ACCESS_TOKEN',
        accountId: this.accountId,
      });
    }
  }

  /**
   * Ensures application-owned physical root directory exists on Google Drive.
   */
  private async getOrCreateAppRootFolder(): Promise<string> {
    if (this.verifiedAppRootId) return this.verifiedAppRootId;
    if (this.config.rootFolderId && this.config.rootFolderId !== 'root') {
      this.verifiedAppRootId = this.config.rootFolderId;
      return this.verifiedAppRootId;
    }

    if (!this.isConfigured()) {
      this.verifiedAppRootId = 'mock_root_app_folder';
      return this.verifiedAppRootId;
    }

    const accessToken = await this.getAccessToken();
    const appFolderName = 'SyncDrive_SaaS_Storage';

    // Search for existing app root folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name = '${appFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    )}&fields=files(id,name)`;

    try {
      const res = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          this.verifiedAppRootId = data.files[0].id;
          return this.verifiedAppRootId!;
        }
      }

      // Create app root folder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: appFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'SyncDrive SaaS Application Root Storage Hierarchy',
        }),
      });

      if (createRes.ok) {
        const created = await createRes.json();
        this.verifiedAppRootId = created.id;
        return this.verifiedAppRootId!;
      }
    } catch (e) {
      console.warn('Could not query/create application root folder on Google Drive, using root:', e);
    }

    this.verifiedAppRootId = 'root';
    return this.verifiedAppRootId;
  }

  async initialize(): Promise<void> {
    if (this.isConfigured()) {
      await this.getAccessToken();
      await this.getOrCreateAppRootFolder();
    }
  }

  /**
   * Upload single buffer payload (used for small files, avatars, preview copies).
   */
  async upload(params: UploadBufferParams): Promise<UploadResult> {
    if (!this.isConfigured()) {
      // Mock / Preview Mode
      const storageObjectId = `mock_gdrive_${crypto.randomUUID()}`;
      const checksum = crypto.createHash('sha256').update(params.buffer).digest('hex');
      this.mockObjects.set(storageObjectId, {
        id: storageObjectId,
        name: `saas_obj_${params.internalFileId}`,
        buffer: params.buffer,
        mimeType: params.mimeType,
        sizeBytes: params.buffer.byteLength,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        storageObjectId,
        checksumSha256: checksum,
        sizeBytes: params.buffer.byteLength,
        storageNodeId: this.accountId,
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const parentFolder = await this.getOrCreateAppRootFolder();

      const metadata = {
        name: `saas_obj_${params.internalFileId}`,
        parents: [parentFolder],
        description: 'SyncDrive SaaS Abstracted Storage Blob',
        properties: {
          saasFileId: params.internalFileId,
          saasStorageNode: this.accountId,
        },
      };

      const boundary = '-------SyncDriveBoundary31415926';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metaPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
      const mediaHeader = `${delimiter}Content-Type: ${params.mimeType}\r\n\r\n`;

      const bodyBuffer = Buffer.concat([
        Buffer.from(metaPart),
        Buffer.from(mediaHeader),
        Buffer.from(params.buffer),
        Buffer.from(closeDelimiter),
      ]);

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': bodyBuffer.byteLength.toString(),
        },
        body: bodyBuffer,
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'MULTIPART_UPLOAD',
          accountId: this.accountId,
          fileId: params.internalFileId,
        });
      }

      const result = await response.json();
      const checksum = crypto.createHash('sha256').update(params.buffer).digest('hex');

      return {
        storageObjectId: result.id,
        checksumSha256: checksum,
        sizeBytes: params.buffer.byteLength,
        storageNodeId: this.accountId,
      };
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'MULTIPART_UPLOAD',
        accountId: this.accountId,
        fileId: params.internalFileId,
      });
    }
  }

  /**
   * Initiates Google Drive v3 Resumable Upload Session.
   * 1. Sends initial POST with metadata to Google Drive API
   * 2. Captures Google's private resumable URI from Location header
   * 3. Stores session securely on server-side
   * 4. Returns internal session token and SaaS API endpoint to client
   */
  async initiateResumableUpload(params: ResumableSessionParams): Promise<ResumableSessionResult> {
    const sessionToken = `gdrive_sess_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (!this.isConfigured()) {
      // Mock / Preview Mode
      this.resumableSessions.set(sessionToken, {
        uploadUrl: `mock://gdrive-upload/${sessionToken}`,
        expectedSize: params.expectedSizeBytes,
        receivedBytes: 0,
        internalFileId: params.internalFileId,
        mimeType: params.mimeType,
        chunks: [],
        isMockSession: true,
      });

      return {
        sessionToken,
        uploadUrl: `/api/files/upload/chunk?sessionToken=${sessionToken}`,
        storageNodeId: this.accountId,
        expiresAt,
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const parentFolder = await this.getOrCreateAppRootFolder();

      const metadata = {
        name: `saas_obj_${params.internalFileId}`,
        parents: [parentFolder],
        description: 'SyncDrive Resumable Chunked Object',
        properties: {
          saasFileId: params.internalFileId,
          saasStorageNode: this.accountId,
        },
      };

      const initUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
      const response = await fetch(initUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': params.mimeType,
          'X-Upload-Content-Length': params.expectedSizeBytes.toString(),
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'INITIATE_RESUMABLE_SESSION',
          accountId: this.accountId,
          fileId: params.internalFileId,
        });
      }

      const sessionLocation = response.headers.get('Location') || response.headers.get('location');
      if (!sessionLocation) {
        throw new StorageOperationError(
          'Google Drive API did not return resumable session Location URL',
          'RESUMABLE_LOCATION_MISSING',
          502
        );
      }

      this.resumableSessions.set(sessionToken, {
        uploadUrl: sessionLocation,
        expectedSize: params.expectedSizeBytes,
        receivedBytes: 0,
        internalFileId: params.internalFileId,
        mimeType: params.mimeType,
        chunks: [],
      });

      return {
        sessionToken,
        uploadUrl: `/api/files/upload/chunk?sessionToken=${sessionToken}`,
        storageNodeId: this.accountId,
        expiresAt,
      };
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'INITIATE_RESUMABLE_SESSION',
        accountId: this.accountId,
        fileId: params.internalFileId,
      });
    }
  }

  /**
   * Uploads an individual chunk to the Google Drive resumable URI.
   * Handles HTTP 308 (Resume Incomplete) vs HTTP 200/201 (Upload Complete).
   */
  async uploadChunk(params: UploadChunkParams): Promise<UploadChunkResult> {
    const session = this.resumableSessions.get(params.sessionToken);
    if (!session) {
      throw new StorageOperationError(
        'The resumable upload session is invalid or expired.',
        'SESSION_EXPIRED',
        404
      );
    }

    session.chunks.push(params.chunk);
    session.receivedBytes += params.chunk.byteLength;

    if (session.isMockSession) {
      const isComplete = session.receivedBytes >= params.totalBytes;
      if (isComplete) {
        const storageObjectId = `mock_gdrive_${crypto.randomUUID()}`;
        const fullBuffer = Buffer.concat(session.chunks.map((c) => Buffer.from(c)));
        const checksum = crypto.createHash('sha256').update(fullBuffer).digest('hex');

        this.mockObjects.set(storageObjectId, {
          id: storageObjectId,
          name: `saas_obj_${session.internalFileId}`,
          buffer: fullBuffer,
          mimeType: session.mimeType,
          sizeBytes: fullBuffer.byteLength,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        this.resumableSessions.delete(params.sessionToken);

        return {
          bytesReceived: session.receivedBytes,
          isComplete: true,
          storageObjectId,
          checksumSha256: checksum,
        };
      }

      return {
        bytesReceived: session.receivedBytes,
        isComplete: false,
      };
    }

    try {
      const startByte = params.startByte;
      const endByte = startByte + params.chunk.byteLength - 1;
      const contentRange = `bytes ${startByte}-${endByte}/${params.totalBytes}`;

      const response = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': contentRange,
          'Content-Length': params.chunk.byteLength.toString(),
        },
        body: Buffer.from(params.chunk),
      });

      // 308 Resume Incomplete indicates chunk was received successfully and upload is still open
      if (response.status === 308) {
        return {
          bytesReceived: session.receivedBytes,
          isComplete: false,
        };
      }

      // 200/201 indicates upload finalized
      if (response.ok || response.status === 200 || response.status === 201) {
        const driveFile = await response.json();
        const fullBuffer = Buffer.concat(session.chunks.map((c) => Buffer.from(c)));
        const checksum = crypto.createHash('sha256').update(fullBuffer).digest('hex');

        this.resumableSessions.delete(params.sessionToken);

        return {
          bytesReceived: session.receivedBytes,
          isComplete: true,
          storageObjectId: driveFile.id,
          checksumSha256: checksum,
        };
      }

      throw await GoogleDriveErrorTranslator.translateResponse(response, {
        operation: 'UPLOAD_CHUNK',
        accountId: this.accountId,
        fileId: session.internalFileId,
      });
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'UPLOAD_CHUNK',
        accountId: this.accountId,
        fileId: session.internalFileId,
      });
    }
  }

  /**
   * Queries Google Drive to resume an interrupted upload:
   * Sends empty PUT with Content-Range: bytes * / totalBytes.
   * Google responds with HTTP 308 and Range: bytes=0-LAST_BYTE header.
   */
  async getResumeOffset(sessionToken: string, totalBytes: number): Promise<{ bytesReceived: number; isComplete: boolean }> {
    const session = this.resumableSessions.get(sessionToken);
    if (!session) {
      throw new StorageOperationError('Upload session not found', 'SESSION_NOT_FOUND', 404);
    }

    if (session.isMockSession) {
      return {
        bytesReceived: session.receivedBytes,
        isComplete: session.receivedBytes >= totalBytes,
      };
    }

    try {
      const response = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes */${totalBytes}`,
        },
      });

      if (response.status === 308) {
        const range = response.headers.get('Range');
        if (range && range.startsWith('bytes=')) {
          const parts = range.replace('bytes=', '').split('-');
          const lastByte = Number(parts[1]);
          const bytesReceived = lastByte + 1;
          session.receivedBytes = bytesReceived;
          return { bytesReceived, isComplete: false };
        }
        return { bytesReceived: 0, isComplete: false };
      }

      if (response.ok) {
        return { bytesReceived: totalBytes, isComplete: true };
      }

      throw await GoogleDriveErrorTranslator.translateResponse(response, {
        operation: 'GET_RESUME_OFFSET',
        accountId: this.accountId,
      });
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'GET_RESUME_OFFSET',
        accountId: this.accountId,
      });
    }
  }

  async completeUpload(uploadSessionId: string): Promise<UploadResult> {
    const session = this.resumableSessions.get(uploadSessionId);
    if (!session) {
      throw new StorageOperationError('Resumable session not found', 'SESSION_NOT_FOUND', 404);
    }

    const fullBuffer = Buffer.concat(session.chunks.map((c) => Buffer.from(c)));
    const checksum = crypto.createHash('sha256').update(fullBuffer).digest('hex');
    const storageObjectId = `gdrive_obj_${crypto.randomUUID()}`;

    this.resumableSessions.delete(uploadSessionId);

    return {
      storageObjectId,
      checksumSha256: checksum,
      sizeBytes: session.receivedBytes,
      storageNodeId: this.accountId,
    };
  }

  /**
   * Aborts upload session and releases Google Drive upload URI.
   */
  async abortUpload(uploadSessionId: string): Promise<boolean> {
    const session = this.resumableSessions.get(uploadSessionId);
    if (!session) return true;

    if (!session.isMockSession) {
      try {
        await fetch(session.uploadUrl, { method: 'DELETE' });
      } catch {
        // Best effort cleanup
      }
    }

    this.resumableSessions.delete(uploadSessionId);
    return true;
  }

  /**
   * Downloads physical object content from Google Drive.
   */
  async download(storageObjectId: string): Promise<DownloadResult> {
    if (!this.isConfigured() || storageObjectId.startsWith('mock_')) {
      const mock = this.mockObjects.get(storageObjectId);
      if (!mock) {
        // Deterministic dummy payload for preview
        const dummy = Buffer.from('SyncDrive Encrypted Abstracted Object Payload');
        return {
          data: new Uint8Array(dummy),
          mimeType: 'application/octet-stream',
          contentLength: dummy.byteLength,
        };
      }
      return {
        data: mock.buffer,
        mimeType: mock.mimeType,
        contentLength: mock.sizeBytes,
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${storageObjectId}?alt=media`;

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'DOWNLOAD_FILE',
          accountId: this.accountId,
          fileId: storageObjectId,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';

      return {
        data: new Uint8Array(arrayBuffer),
        mimeType,
        contentLength: arrayBuffer.byteLength,
      };
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'DOWNLOAD_FILE',
        accountId: this.accountId,
        fileId: storageObjectId,
      });
    }
  }

  /**
   * Permanently deletes physical object from Google Drive account.
   */
  async delete(storageObjectId: string): Promise<boolean> {
    if (!this.isConfigured() || storageObjectId.startsWith('mock_')) {
      this.mockObjects.delete(storageObjectId);
      return true;
    }

    try {
      const accessToken = await this.getAccessToken();
      const deleteUrl = `https://www.googleapis.com/drive/v3/files/${storageObjectId}`;

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.ok || response.status === 404;
    } catch {
      return true;
    }
  }

  /**
   * Lists physical files in the application root folder on Google Drive.
   * Used by the reconciliation service.
   */
  async list(prefix?: string): Promise<StorageObjectMetadata[]> {
    if (!this.isConfigured()) {
      return Array.from(this.mockObjects.values()).map((m) => ({
        objectId: m.id,
        name: m.name,
        sizeBytes: m.sizeBytes,
        mimeType: m.mimeType,
        isFolder: false,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));
    }

    try {
      const accessToken = await this.getAccessToken();
      const parentFolder = await this.getOrCreateAppRootFolder();
      const q = `'${parentFolder}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name,size,mimeType,createdTime,modifiedTime)&pageSize=1000`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.files || []).map((f: any) => ({
        objectId: f.id,
        name: f.name,
        sizeBytes: Number(f.size || 0),
        mimeType: f.mimeType,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        createdAt: f.createdTime,
        updatedAt: f.modifiedTime,
      }));
    } catch {
      return [];
    }
  }

  async createFolder(folderName: string): Promise<{ objectId: string }> {
    if (!this.isConfigured()) {
      const id = `mock_folder_${crypto.randomUUID()}`;
      return { objectId: id };
    }

    try {
      const accessToken = await this.getAccessToken();
      const parentFolder = await this.getOrCreateAppRootFolder();

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolder],
        }),
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'CREATE_FOLDER',
          accountId: this.accountId,
        });
      }

      const data = await response.json();
      return { objectId: data.id };
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'CREATE_FOLDER',
        accountId: this.accountId,
      });
    }
  }

  async rename(storageObjectId: string, newName: string): Promise<boolean> {
    if (!this.isConfigured() || storageObjectId.startsWith('mock_')) {
      const mock = this.mockObjects.get(storageObjectId);
      if (mock) mock.name = newName;
      return true;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${storageObjectId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async move(storageObjectId: string, targetPath: string): Promise<boolean> {
    if (!this.isConfigured() || storageObjectId.startsWith('mock_')) {
      return true;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${storageObjectId}?addParents=${targetPath}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async copy(sourceObjectId: string, destinationName: string): Promise<{ newObjectId: string }> {
    if (!this.isConfigured() || sourceObjectId.startsWith('mock_')) {
      const mock = this.mockObjects.get(sourceObjectId);
      const newId = `mock_gdrive_${crypto.randomUUID()}`;
      if (mock) {
        this.mockObjects.set(newId, {
          ...mock,
          id: newId,
          name: destinationName,
        });
      } else {
        const defaultData = Buffer.from('SyncDrive Encrypted Abstracted Object Payload');
        this.mockObjects.set(newId, {
          id: newId,
          name: destinationName,
          buffer: new Uint8Array(defaultData),
          mimeType: 'application/octet-stream',
          sizeBytes: defaultData.byteLength,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return { newObjectId: newId };
    }

    try {
      const accessToken = await this.getAccessToken();
      const parentFolder = await this.getOrCreateAppRootFolder();
      const url = `https://www.googleapis.com/drive/v3/files/${sourceObjectId}/copy`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: destinationName,
          parents: [parentFolder],
        }),
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'COPY_OBJECT',
          accountId: this.accountId,
          fileId: sourceObjectId,
        });
      }

      const data = await response.json();
      return { newObjectId: data.id };
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'COPY_OBJECT',
        accountId: this.accountId,
        fileId: sourceObjectId,
      });
    }
  }

  async getMetadata(storageObjectId: string): Promise<StorageObjectMetadata> {
    if (!this.isConfigured() || storageObjectId.startsWith('mock_')) {
      const mock = this.mockObjects.get(storageObjectId);
      if (mock) {
        return {
          objectId: mock.id,
          name: mock.name,
          sizeBytes: mock.sizeBytes,
          mimeType: mock.mimeType,
          isFolder: false,
          createdAt: mock.createdAt,
          updatedAt: mock.updatedAt,
        };
      }
      return {
        objectId: storageObjectId,
        name: `obj_${storageObjectId}`,
        sizeBytes: 1024,
        mimeType: 'application/octet-stream',
        isFolder: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const url = `https://www.googleapis.com/drive/v3/files/${storageObjectId}?fields=id,name,size,mimeType,createdTime,modifiedTime`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw await GoogleDriveErrorTranslator.translateResponse(response, {
          operation: 'GET_METADATA',
          accountId: this.accountId,
          fileId: storageObjectId,
        });
      }

      const data = await response.json();
      return {
        objectId: data.id,
        name: data.name,
        sizeBytes: Number(data.size || 0),
        mimeType: data.mimeType,
        isFolder: data.mimeType === 'application/vnd.google-apps.folder',
        createdAt: data.createdTime,
        updatedAt: data.modifiedTime,
      };
    } catch (err) {
      throw GoogleDriveErrorTranslator.translateError(err, {
        operation: 'GET_METADATA',
        accountId: this.accountId,
        fileId: storageObjectId,
      });
    }
  }

  async exists(storageObjectId: string): Promise<boolean> {
    try {
      await this.getMetadata(storageObjectId);
      return true;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<StorageHealthResult> {
    if (!this.isConfigured()) {
      return {
        isHealthy: true,
        provider: this.providerType,
        availableCapacityBytes: 15 * 1024 * 1024 * 1024,
        message: `Node ${this.accountId} running in sandbox simulation mode`,
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        return {
          isHealthy: false,
          provider: this.providerType,
          message: `Health check failed: HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const limit = Number(data.storageQuota?.limit || 0);
      const usage = Number(data.storageQuota?.usage || 0);

      return {
        isHealthy: true,
        provider: this.providerType,
        availableCapacityBytes: Math.max(0, limit - usage),
        message: `Node ${this.accountId} healthy`,
      };
    } catch (e: any) {
      return {
        isHealthy: false,
        provider: this.providerType,
        message: e?.message || 'Error communicating with Google Drive node',
      };
    }
  }

  // Backward-compatibility aliases
  async createUploadSession(params: ResumableSessionParams): Promise<ResumableSessionResult> {
    return this.initiateResumableUpload(params);
  }

  async uploadBuffer(params: UploadBufferParams): Promise<UploadResult> {
    return this.upload(params);
  }

  async downloadStream(storageObjectId: string): Promise<DownloadResult> {
    return this.download(storageObjectId);
  }

  async deleteObject(storageObjectId: string): Promise<boolean> {
    return this.delete(storageObjectId);
  }

  async copyObject(sourceObjectId: string, newFilename: string): Promise<{ newStorageObjectId: string }> {
    const { newObjectId } = await this.copy(sourceObjectId, newFilename);
    return { newStorageObjectId: newObjectId };
  }
}
