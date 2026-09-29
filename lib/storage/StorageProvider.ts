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
} from './types';

/**
 * StorageProvider Interface
 *
 * Core abstraction isolating physical storage implementations (Google Drive, S3, Azure, Local)
 * from SaaS domain services. Customers and application controllers never directly touch
 * physical account details, OAuth credentials, or third-party storage IDs.
 */
export interface StorageProvider {
  readonly providerType: string;

  /**
   * Initializes the provider (e.g. validates credentials, refreshes tokens, pings node).
   */
  initialize(): Promise<void>;

  /**
   * Upload an entire file payload via buffer/stream.
   */
  upload(params: UploadBufferParams): Promise<UploadResult>;

  /**
   * Initiate a resumable chunked upload session for large files.
   */
  initiateResumableUpload(params: ResumableSessionParams): Promise<ResumableSessionResult>;

  /**
   * Upload an individual chunk in a resumable upload sequence.
   */
  uploadChunk(params: UploadChunkParams): Promise<UploadChunkResult>;

  /**
   * Finalize and commit a resumable upload session.
   */
  completeUpload(uploadSessionId: string): Promise<UploadResult>;

  /**
   * Abort and clean up an incomplete resumable upload session.
   */
  abortUpload(uploadSessionId: string): Promise<boolean>;

  /**
   * Download / stream object content.
   */
  download(storageObjectId: string): Promise<DownloadResult>;

  /**
   * Permanently delete a physical storage object.
   */
  delete(storageObjectId: string): Promise<boolean>;

  /**
   * List objects within a path prefix or directory in physical storage.
   */
  list(prefix?: string): Promise<StorageObjectMetadata[]>;

  /**
   * Create a physical folder/prefix in the underlying storage.
   */
  createFolder(folderName: string, parentPath?: string): Promise<{ objectId: string }>;

  /**
   * Rename an object in physical storage.
   */
  rename(storageObjectId: string, newName: string): Promise<boolean>;

  /**
   * Move an object to a new directory/prefix in physical storage.
   */
  move(storageObjectId: string, targetPath: string): Promise<boolean>;

  /**
   * Duplicate / copy an object.
   */
  copy(sourceObjectId: string, destinationName: string): Promise<{ newObjectId: string }>;

  /**
   * Retrieve storage object metadata directly from the provider.
   */
  getMetadata(storageObjectId: string): Promise<StorageObjectMetadata>;

  /**
   * Check whether an object exists in physical storage.
   */
  exists(storageObjectId: string): Promise<boolean>;

  /**
   * Health and quota telemetry for the storage pool node.
   */
  getHealth(): Promise<StorageHealthResult>;

  /**
   * Optional check whether an in-flight upload session belongs to this provider instance.
   */
  hasSession?(sessionToken: string): boolean;

  // Backward-compatibility aliases for existing calls
  createUploadSession(params: ResumableSessionParams): Promise<ResumableSessionResult>;
  uploadBuffer(params: UploadBufferParams): Promise<UploadResult>;
  downloadStream(storageObjectId: string): Promise<DownloadResult>;
  deleteObject(storageObjectId: string): Promise<boolean>;
  copyObject(sourceObjectId: string, newFilename: string): Promise<{ newStorageObjectId: string }>;
}
