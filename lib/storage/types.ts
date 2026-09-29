export interface StorageObjectMetadata {
  objectId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  isFolder: boolean;
  checksumSha256?: string;
  createdAt: string;
  updatedAt: string;
  customMetadata?: Record<string, string>;
}

export interface UploadBufferParams {
  internalFileId: string;
  filename: string;
  buffer: Uint8Array;
  mimeType: string;
  parentPath?: string;
}

export interface UploadResult {
  storageObjectId: string;
  checksumSha256: string;
  sizeBytes: number;
  storageNodeId?: string;
}

export interface ResumableSessionParams {
  internalFileId: string;
  filename: string;
  expectedSizeBytes: number;
  mimeType: string;
  parentPath?: string;
}

export interface ResumableSessionResult {
  sessionToken: string;
  uploadUrl?: string;
  storageNodeId?: string;
  expiresAt: string;
}

export interface UploadChunkParams {
  sessionToken: string;
  chunk: Uint8Array;
  startByte: number;
  totalBytes: number;
}

export interface UploadChunkResult {
  bytesReceived: number;
  isComplete: boolean;
  storageObjectId?: string;
  checksumSha256?: string;
}

export interface DownloadResult {
  data: Uint8Array;
  mimeType: string;
  contentLength: number;
  filename?: string;
}

export interface StorageHealthResult {
  isHealthy: boolean;
  provider: string;
  availableCapacityBytes?: number;
  message?: string;
}

// Backward compatibility aliases
export type UploadSessionInitParams = ResumableSessionParams;
export type UploadSessionResult = ResumableSessionResult;
export type UploadBufferResult = UploadResult;
