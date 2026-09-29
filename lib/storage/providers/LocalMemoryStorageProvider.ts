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

interface InMemoryObject {
  id: string;
  data: Uint8Array;
  mimeType: string;
  filename: string;
  checksumSha256: string;
  isFolder: boolean;
  parentPath?: string;
  createdAt: string;
  updatedAt: string;
}

interface InFlightSession {
  token: string;
  internalFileId: string;
  filename: string;
  expectedSizeBytes: number;
  mimeType: string;
  parentPath?: string;
  chunks: Uint8Array[];
  receivedBytes: number;
  expiresAt: string;
}

/**
 * LocalMemoryStorageProvider
 *
 * In-memory sandbox storage backend implementing the strict StorageProvider contract.
 * Used for zero-friction preview, developer unit testing, and sandbox environments.
 * Strictly adheres to the StorageProvider interface contract.
 */
export class LocalMemoryStorageProvider implements StorageProvider {
  readonly providerType = 'local_memory';

  private static objects: Map<string, InMemoryObject> = new Map();
  private static sessions: Map<string, InFlightSession> = new Map();

  async initialize(): Promise<void> {
    if (LocalMemoryStorageProvider.objects.size === 0) {
      this.seedInitialObjects();
    }
  }

  private seedInitialObjects() {
    const sampleReadme = Buffer.from(
      `# Welcome to SyncDrive\n\nYour production-grade personal cloud storage.\n\n- Logical Quota: 100 GiB (Expandable up to 1 TiB)\n- Encrypted Storage Architecture\n- Resumable Chunked Uploads\n- Instant Share Links\n\nStorage backend is abstracted and isolated.\n`
    );
    const id = 'sample_welcome_doc';
    const checksum = crypto.createHash('sha256').update(sampleReadme).digest('hex');

    LocalMemoryStorageProvider.objects.set(id, {
      id,
      data: new Uint8Array(sampleReadme),
      mimeType: 'text/markdown',
      filename: 'Welcome_to_SyncDrive.md',
      checksumSha256: checksum,
      isFolder: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async upload(params: UploadBufferParams): Promise<UploadResult> {
    const storageObjectId = `obj_${crypto.randomUUID()}`;
    const checksum = crypto.createHash('sha256').update(params.buffer).digest('hex');

    LocalMemoryStorageProvider.objects.set(storageObjectId, {
      id: storageObjectId,
      data: params.buffer,
      mimeType: params.mimeType,
      filename: params.filename,
      checksumSha256: checksum,
      isFolder: false,
      parentPath: params.parentPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      storageObjectId,
      checksumSha256: checksum,
      sizeBytes: params.buffer.byteLength,
    };
  }

  async initiateResumableUpload(params: ResumableSessionParams): Promise<ResumableSessionResult> {
    const sessionToken = `session_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    LocalMemoryStorageProvider.sessions.set(sessionToken, {
      token: sessionToken,
      internalFileId: params.internalFileId,
      filename: params.filename,
      expectedSizeBytes: params.expectedSizeBytes,
      mimeType: params.mimeType,
      parentPath: params.parentPath,
      chunks: [],
      receivedBytes: 0,
      expiresAt,
    });

    return {
      sessionToken,
      uploadUrl: `/api/files/upload/chunk?sessionToken=${sessionToken}`,
      storageNodeId: 'node_memory_primary',
      expiresAt,
    };
  }

  public hasSession(sessionToken: string): boolean {
    return LocalMemoryStorageProvider.sessions.has(sessionToken);
  }

  async uploadChunk(params: UploadChunkParams): Promise<UploadChunkResult> {
    const session = LocalMemoryStorageProvider.sessions.get(params.sessionToken);
    if (!session) {
      throw new Error(`Invalid or expired upload session: ${params.sessionToken}`);
    }

    session.chunks.push(params.chunk);
    session.receivedBytes += params.chunk.byteLength;

    if (session.receivedBytes >= session.expectedSizeBytes) {
      const fullBuffer = new Uint8Array(session.receivedBytes);
      let offset = 0;
      for (const chunk of session.chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const storageObjectId = `obj_${crypto.randomUUID()}`;
      const checksum = crypto.createHash('sha256').update(fullBuffer).digest('hex');

      LocalMemoryStorageProvider.objects.set(storageObjectId, {
        id: storageObjectId,
        data: fullBuffer,
        mimeType: session.mimeType,
        filename: session.filename,
        checksumSha256: checksum,
        isFolder: false,
        parentPath: session.parentPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      LocalMemoryStorageProvider.sessions.delete(params.sessionToken);

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

  async completeUpload(uploadSessionId: string): Promise<UploadResult> {
    const session = LocalMemoryStorageProvider.sessions.get(uploadSessionId);
    if (!session) {
      throw new Error(`Upload session not found: ${uploadSessionId}`);
    }

    const fullBuffer = new Uint8Array(session.receivedBytes);
    let offset = 0;
    for (const chunk of session.chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const storageObjectId = `obj_${crypto.randomUUID()}`;
    const checksum = crypto.createHash('sha256').update(fullBuffer).digest('hex');

    LocalMemoryStorageProvider.objects.set(storageObjectId, {
      id: storageObjectId,
      data: fullBuffer,
      mimeType: session.mimeType,
      filename: session.filename,
      checksumSha256: checksum,
      isFolder: false,
      parentPath: session.parentPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    LocalMemoryStorageProvider.sessions.delete(uploadSessionId);

    return {
      storageObjectId,
      checksumSha256: checksum,
      sizeBytes: fullBuffer.byteLength,
    };
  }

  async abortUpload(uploadSessionId: string): Promise<boolean> {
    return LocalMemoryStorageProvider.sessions.delete(uploadSessionId);
  }

  async download(storageObjectId: string): Promise<DownloadResult> {
    const obj = LocalMemoryStorageProvider.objects.get(storageObjectId);
    if (!obj) {
      throw new Error(`Physical storage object not found: ${storageObjectId}`);
    }

    return {
      data: obj.data,
      mimeType: obj.mimeType,
      contentLength: obj.data.byteLength,
      filename: obj.filename,
    };
  }

  async delete(storageObjectId: string): Promise<boolean> {
    return LocalMemoryStorageProvider.objects.delete(storageObjectId);
  }

  async list(prefix?: string): Promise<StorageObjectMetadata[]> {
    const results: StorageObjectMetadata[] = [];
    for (const obj of LocalMemoryStorageProvider.objects.values()) {
      if (!prefix || obj.filename.startsWith(prefix) || obj.parentPath === prefix) {
        results.push({
          objectId: obj.id,
          name: obj.filename,
          sizeBytes: obj.data.byteLength,
          mimeType: obj.mimeType,
          isFolder: obj.isFolder,
          checksumSha256: obj.checksumSha256,
          createdAt: obj.createdAt,
          updatedAt: obj.updatedAt,
        });
      }
    }
    return results;
  }

  async createFolder(folderName: string, parentPath?: string): Promise<{ objectId: string }> {
    const objectId = `folder_${crypto.randomUUID()}`;
    LocalMemoryStorageProvider.objects.set(objectId, {
      id: objectId,
      data: new Uint8Array(0),
      mimeType: 'application/vnd.syncdrive.folder',
      filename: folderName,
      checksumSha256: '',
      isFolder: true,
      parentPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { objectId };
  }

  async rename(storageObjectId: string, newName: string): Promise<boolean> {
    const obj = LocalMemoryStorageProvider.objects.get(storageObjectId);
    if (!obj) return false;
    obj.filename = newName;
    obj.updatedAt = new Date().toISOString();
    return true;
  }

  async move(storageObjectId: string, targetPath: string): Promise<boolean> {
    const obj = LocalMemoryStorageProvider.objects.get(storageObjectId);
    if (!obj) return false;
    obj.parentPath = targetPath;
    obj.updatedAt = new Date().toISOString();
    return true;
  }

  async copy(sourceObjectId: string, destinationName: string): Promise<{ newObjectId: string }> {
    const source = LocalMemoryStorageProvider.objects.get(sourceObjectId);
    if (!source) {
      throw new Error(`Source object not found: ${sourceObjectId}`);
    }

    const newObjectId = `obj_${crypto.randomUUID()}`;
    const duplicateData = new Uint8Array(source.data);

    LocalMemoryStorageProvider.objects.set(newObjectId, {
      id: newObjectId,
      data: duplicateData,
      mimeType: source.mimeType,
      filename: destinationName,
      checksumSha256: source.checksumSha256,
      isFolder: source.isFolder,
      parentPath: source.parentPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { newObjectId };
  }

  async getMetadata(storageObjectId: string): Promise<StorageObjectMetadata> {
    const obj = LocalMemoryStorageProvider.objects.get(storageObjectId);
    if (!obj) {
      throw new Error(`Object not found: ${storageObjectId}`);
    }
    return {
      objectId: obj.id,
      name: obj.filename,
      sizeBytes: obj.data.byteLength,
      mimeType: obj.mimeType,
      isFolder: obj.isFolder,
      checksumSha256: obj.checksumSha256,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async exists(storageObjectId: string): Promise<boolean> {
    return LocalMemoryStorageProvider.objects.has(storageObjectId);
  }

  async getHealth(): Promise<StorageHealthResult> {
    let totalStoredBytes = 0;
    for (const item of LocalMemoryStorageProvider.objects.values()) {
      totalStoredBytes += item.data.byteLength;
    }

    return {
      isHealthy: true,
      provider: this.providerType,
      availableCapacityBytes: 10 * 1024 * 1024 * 1024, // 10 GiB sandbox capacity
      message: `Active sandbox storage (${LocalMemoryStorageProvider.objects.size} objects, ${(totalStoredBytes / (1024 * 1024)).toFixed(2)} MB stored)`,
    };
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
