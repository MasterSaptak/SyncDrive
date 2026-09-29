import crypto from 'crypto';
import { InternalFileRecord, PublicFileItem, ShareLink } from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { storageManager } from '@/lib/storage/StorageManager';
import { QuotaService } from './quota.service';
import { StorageAllocationService } from './storage-allocation.service';
import { AuditService } from './audit.service';

export class FileNotFoundError extends Error {
  constructor(message = 'File or folder not found') {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class UnauthorizedAccessError extends Error {
  constructor(message = 'You do not have permission to access this resource') {
    super(message);
    this.name = 'UnauthorizedAccessError';
  }
}

export interface ListFilesOptions {
  isTrash?: boolean;
  view?: 'files' | 'recent' | 'starred' | 'shared' | 'trash';
  search?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'name' | 'size' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ListFilesResult {
  files: PublicFileItem[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

export class FileService {
  /**
   * Sanitizes internal file metadata before returning to public client.
   * Strips all Google Drive / storage backend internals.
   */
  public static sanitize(file: InternalFileRecord): PublicFileItem {
    return {
      id: file.id,
      parentId: file.parentId,
      name: file.name,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      checksumSha256: file.checksumSha256,
      isFolder: file.isFolder,
      isStarred: Boolean(file.isStarred),
      isTrash: file.isTrash,
      deletedAt: file.deletedAt,
      version: file.version,
      uploadStatus: file.uploadStatus,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  /**
   * Lists files for a user supporting hierarchical folders, views (Recent, Starred, Trash),
   * advanced metadata search filters, and cursor/offset pagination.
   */
  static async listFiles(
    userId: string,
    parentId: string | null = null,
    options?: ListFilesOptions
  ): Promise<PublicFileItem[]> {
    const view = options?.view || (options?.isTrash ? 'trash' : 'files');
    const search = options?.search?.trim().toLowerCase();
    const mimeFilter = options?.mimeType?.trim().toLowerCase();
    const minSize = options?.minSize;
    const maxSize = options?.maxSize;
    const startDate = options?.startDate ? new Date(options.startDate).getTime() : null;
    const endDate = options?.endDate ? new Date(options.endDate).getTime() : null;

    let matchedFiles: InternalFileRecord[] = [];

    for (const file of dataStore.files.values()) {
      if (file.userId !== userId) continue;

      // 1. View-based segregation
      if (view === 'trash') {
        if (!file.isTrash) continue;
      } else {
        if (file.isTrash) continue;

        if (view === 'starred') {
          if (!file.isStarred) continue;
        } else if (view === 'recent') {
          // Recent view: show files modified/created in chronological order
          // folders excluded in recent files
          if (file.isFolder) continue;
        } else if (view === 'shared') {
          // Shared view: files associated with active share links
          let isShared = false;
          for (const link of dataStore.shareLinks.values()) {
            if (link.fileId === file.id && link.userId === userId) {
              isShared = true;
              break;
            }
          }
          if (!isShared) continue;
        } else {
          // Default hierarchical view: match parent folder if no search query provided
          if (!search && file.parentId !== parentId) {
            continue;
          }
        }
      }

      // 2. Metadata Search Filters
      if (search) {
        const matchesName = file.name.toLowerCase().includes(search);
        const matchesMime = file.mimeType.toLowerCase().includes(search);
        if (!matchesName && !matchesMime) continue;
      }

      if (mimeFilter && mimeFilter !== 'all') {
        if (mimeFilter === 'folder' && !file.isFolder) continue;
        if (mimeFilter === 'image' && !file.mimeType.startsWith('image/')) continue;
        if (mimeFilter === 'document' && !file.mimeType.includes('pdf') && !file.mimeType.includes('document') && !file.mimeType.includes('text')) continue;
        if (mimeFilter === 'video' && !file.mimeType.startsWith('video/')) continue;
        if (mimeFilter === 'audio' && !file.mimeType.startsWith('audio/')) continue;
        if (mimeFilter === 'archive' && !file.mimeType.includes('zip') && !file.mimeType.includes('tar') && !file.mimeType.includes('compressed')) continue;
      }

      if (minSize !== undefined && file.sizeBytes < minSize) continue;
      if (maxSize !== undefined && file.sizeBytes > maxSize) continue;

      if (startDate || endDate) {
        const fileTime = new Date(file.updatedAt || file.createdAt).getTime();
        if (startDate && fileTime < startDate) continue;
        if (endDate && fileTime > endDate) continue;
      }

      matchedFiles.push(file);
    }

    // 3. Sorting
    const sortBy = options?.sortBy || (view === 'recent' ? 'date' : 'name');
    const sortOrder = options?.sortOrder || (view === 'recent' ? 'desc' : 'asc');

    matchedFiles.sort((a, b) => {
      // Keep folders on top in standard folder view
      if (view === 'files' && !search) {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
      }

      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        comparison = a.sizeBytes - b.sizeBytes;
      } else if (sortBy === 'date') {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        comparison = timeA - timeB;
      } else if (sortBy === 'type') {
        comparison = a.mimeType.localeCompare(b.mimeType);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 4. Pagination
    if (options?.limit && options.limit > 0) {
      const offset = options.offset || 0;
      matchedFiles = matchedFiles.slice(offset, offset + options.limit);
    }

    return matchedFiles.map((f) => this.sanitize(f));
  }

  /**
   * Resolves the full breadcrumb path for a given folder ID.
   * e.g., My Files / Documents / Projects / 2026
   */
  static async getBreadcrumbPath(
    userId: string,
    folderId: string | null
  ): Promise<Array<{ id: string; name: string }>> {
    if (!folderId) return [];

    const path: Array<{ id: string; name: string }> = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = dataStore.files.get(currentId);
      if (!folder || folder.userId !== userId || !folder.isFolder) break;
      path.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }

    return path;
  }

  /**
   * Toggles or sets the starred flag on a file/folder.
   */
  static async setStarred(userId: string, fileId: string, isStarred?: boolean): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    file.isStarred = isStarred !== undefined ? isStarred : !file.isStarred;
    file.updatedAt = new Date().toISOString();

    await AuditService.log({
      userId,
      action: file.isStarred ? 'FILE_STARRED' : 'FILE_UNSTARRED',
      resourceType: file.isFolder ? 'folder' : 'file',
      resourceId: file.id,
      metadata: { name: file.name, isStarred: file.isStarred },
    });

    return this.sanitize(file);
  }

  /**
   * Bulk moves multiple files or folders.
   */
  static async bulkMove(
    userId: string,
    fileIds: string[],
    targetParentId: string | null
  ): Promise<number> {
    if (targetParentId) {
      const target = dataStore.files.get(targetParentId);
      if (!target || target.userId !== userId || !target.isFolder) {
        throw new Error('Invalid target destination folder');
      }
    }

    let movedCount = 0;
    for (const id of fileIds) {
      // Prevent moving a folder into itself
      if (id === targetParentId) continue;
      const file = dataStore.files.get(id);
      if (file && file.userId === userId && !file.isTrash) {
        file.parentId = targetParentId;
        file.updatedAt = new Date().toISOString();
        movedCount++;
      }
    }

    if (movedCount > 0) {
      await AuditService.log({
        userId,
        action: 'BULK_FILES_MOVED',
        resourceType: 'file',
        resourceId: targetParentId || 'root',
        metadata: { movedCount, targetParentId },
      });
    }

    return movedCount;
  }

  /**
   * Bulk soft-deletes files to trash.
   */
  static async bulkTrash(userId: string, fileIds: string[]): Promise<number> {
    let trashedCount = 0;
    const now = new Date().toISOString();

    for (const id of fileIds) {
      const file = dataStore.files.get(id);
      if (file && file.userId === userId && !file.isTrash) {
        file.isTrash = true;
        file.deletedAt = now;
        file.updatedAt = now;
        trashedCount++;
      }
    }

    if (trashedCount > 0) {
      await AuditService.log({
        userId,
        action: 'BULK_FILES_TRASHED',
        resourceType: 'file',
        resourceId: 'bulk',
        metadata: { trashedCount, fileIds },
      });
    }

    return trashedCount;
  }

  /**
   * Bulk restores files from trash.
   */
  static async bulkRestore(userId: string, fileIds: string[]): Promise<number> {
    let restoredCount = 0;
    const now = new Date().toISOString();

    for (const id of fileIds) {
      const file = dataStore.files.get(id);
      if (file && file.userId === userId && file.isTrash) {
        file.isTrash = false;
        file.deletedAt = null;
        file.updatedAt = now;
        restoredCount++;
      }
    }

    if (restoredCount > 0) {
      await AuditService.log({
        userId,
        action: 'BULK_FILES_RESTORED',
        resourceType: 'file',
        resourceId: 'bulk',
        metadata: { restoredCount, fileIds },
      });
    }

    return restoredCount;
  }

  /**
   * Bulk permanently purges files.
   */
  static async bulkPurge(userId: string, fileIds: string[]): Promise<number> {
    let purgedCount = 0;
    for (const id of fileIds) {
      try {
        await this.permanentDelete(userId, id);
        purgedCount++;
      } catch (err) {
        console.warn(`Failed to purge file ${id}:`, err);
      }
    }
    return purgedCount;
  }

  /**
   * Bulk stars or unstars files.
   */
  static async bulkStar(userId: string, fileIds: string[], isStarred: boolean): Promise<number> {
    let count = 0;
    for (const id of fileIds) {
      const file = dataStore.files.get(id);
      if (file && file.userId === userId) {
        file.isStarred = isStarred;
        file.updatedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  /**
   * Retrieves single file metadata (with ownership validation).
   */
  static async getFile(userId: string, fileId: string): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) {
      throw new FileNotFoundError();
    }
    if (file.userId !== userId) {
      throw new UnauthorizedAccessError();
    }
    return this.sanitize(file);
  }

  /**
   * Creates a new logical folder.
   */
  static async createFolder(userId: string, parentId: string | null, name: string): Promise<PublicFileItem> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Folder name cannot be empty');
    }

    // Validate parent if provided
    if (parentId) {
      const parent = dataStore.files.get(parentId);
      if (!parent || parent.userId !== userId || !parent.isFolder) {
        throw new Error('Invalid parent folder');
      }
    }

    const folderId = `folder_${crypto.randomUUID()}`;
    const newFolder: InternalFileRecord = {
      id: folderId,
      userId,
      parentId,
      name: cleanName,
      sizeBytes: 0,
      mimeType: 'inode/directory',
      isFolder: true,
      isTrash: false,
      deletedAt: null,
      storageProvider: 'local_memory',
      storageObjectId: '',
      uploadStatus: 'completed',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStore.files.set(folderId, newFolder);

    await AuditService.log({
      userId,
      action: 'FOLDER_CREATED',
      resourceType: 'folder',
      resourceId: folderId,
      metadata: { name: cleanName, parentId },
    });

    return this.sanitize(newFolder);
  }

  /**
   * Initializes file upload with quota and physical capacity reservations.
   */
  static async initUpload(
    userId: string,
    parentId: string | null,
    filename: string,
    sizeBytes: number,
    mimeType: string
  ): Promise<{ internalFileId: string; reservationId: string; sessionToken: string }> {
    const userProfile = dataStore.profiles.get(userId);
    const tenantId = userProfile?.tenantId || 'tenant_default_123';

    // 1. Reserve customer logical quota (concurrency controlled)
    const reservation = await QuotaService.reserveQuota(userId, sizeBytes);

    const internalFileId = `file_${crypto.randomUUID()}`;

    // 2. Reserve underlying physical storage capacity across storage fleet
    let physicalReservation;
    try {
      physicalReservation = await StorageAllocationService.reservePhysicalCapacity({
        userId,
        tenantId,
        neededBytes: sizeBytes,
        fileId: internalFileId,
      });
    } catch (allocErr) {
      await QuotaService.releaseReservation(reservation.id);
      throw allocErr;
    }

    try {
      // 3. Initialize storage session on the selected Google Drive node
      const provider = await storageManager.getProviderForAccount(physicalReservation.storageAccountId);
      const session = await provider.createUploadSession({
        internalFileId,
        filename,
        expectedSizeBytes: sizeBytes,
        mimeType: mimeType || 'application/octet-stream',
      });
      storageManager.recordSessionAccount(session.sessionToken, physicalReservation.storageAccountId);

      // 4. Create pending file metadata record (with internal account mapping)
      const record: InternalFileRecord = {
        id: internalFileId,
        userId,
        parentId,
        name: filename,
        sizeBytes,
        mimeType: mimeType || 'application/octet-stream',
        isFolder: false,
        isTrash: false,
        deletedAt: null,
        storageProvider: provider.providerType as any,
        storageAccountId: physicalReservation.storageAccountId,
        storageObjectId: '',
        storageNodeId: session.storageNodeId,
        uploadStatus: 'uploading',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dataStore.files.set(internalFileId, record);

      return {
        internalFileId,
        reservationId: reservation.id,
        sessionToken: session.sessionToken,
      };
    } catch (sessionErr) {
      await QuotaService.releaseReservation(reservation.id);
      await StorageAllocationService.releasePhysicalReservation(physicalReservation.id);
      throw sessionErr;
    }
  }

  /**
   * Completes file upload: commits quota and physical capacity, and updates file metadata.
   */
  static async completeUpload(
    userId: string,
    internalFileId: string,
    reservationId: string,
    storageObjectId: string,
    checksumSha256?: string
  ): Promise<PublicFileItem> {
    const file = dataStore.files.get(internalFileId);
    if (!file || file.userId !== userId) {
      throw new FileNotFoundError('Target file record not found');
    }

    // Commit logical quota reservation to used_bytes
    await QuotaService.commitReservation(reservationId, file.sizeBytes);

    // Commit physical capacity reservation on the chosen storage account
    for (const physRes of dataStore.physicalReservations.values()) {
      if (physRes.internalFileId === internalFileId && physRes.status === 'active') {
        await StorageAllocationService.commitPhysicalUsage(physRes.id, file.sizeBytes);
        break;
      }
    }

    file.storageObjectId = storageObjectId;
    file.checksumSha256 = checksumSha256 || crypto.createHash('sha256').update(file.name).digest('hex');
    file.uploadStatus = 'completed';
    file.updatedAt = new Date().toISOString();

    await AuditService.log({
      userId,
      action: 'FILE_UPLOADED',
      resourceType: 'file',
      resourceId: file.id,
      metadata: { name: file.name, sizeBytes: file.sizeBytes, mimeType: file.mimeType },
    });

    return this.sanitize(file);
  }

  /**
   * Direct buffer upload for small-to-medium files.
   */
  static async uploadDirect(
    userId: string,
    parentId: string | null,
    filename: string,
    buffer: Uint8Array,
    mimeType: string
  ): Promise<PublicFileItem> {
    const sizeBytes = buffer.byteLength;
    const userProfile = dataStore.profiles.get(userId);
    const tenantId = userProfile?.tenantId || 'tenant_default_123';

    // 1. Reserve customer logical quota
    const reservation = await QuotaService.reserveQuota(userId, sizeBytes);
    const internalFileId = `file_${crypto.randomUUID()}`;

    // 2. Reserve physical capacity
    let physicalReservation;
    try {
      physicalReservation = await StorageAllocationService.reservePhysicalCapacity({
        userId,
        tenantId,
        neededBytes: sizeBytes,
        fileId: internalFileId,
      });
    } catch (allocErr) {
      await QuotaService.releaseReservation(reservation.id);
      throw allocErr;
    }

    try {
      const provider = await storageManager.getProviderForAccount(physicalReservation.storageAccountId);

      const result = await provider.uploadBuffer({
        internalFileId,
        filename,
        buffer,
        mimeType,
      });

      // 3. Commit quota and physical usage
      await QuotaService.commitReservation(reservation.id, sizeBytes);
      await StorageAllocationService.commitPhysicalUsage(physicalReservation.id, sizeBytes);

      const record: InternalFileRecord = {
        id: internalFileId,
        userId,
        parentId,
        name: filename,
        sizeBytes,
        mimeType: mimeType || 'application/octet-stream',
        checksumSha256: result.checksumSha256,
        isFolder: false,
        isTrash: false,
        deletedAt: null,
        storageProvider: provider.providerType as any,
        storageAccountId: physicalReservation.storageAccountId,
        storageObjectId: result.storageObjectId,
        uploadStatus: 'completed',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dataStore.files.set(internalFileId, record);

      await AuditService.log({
        userId,
        action: 'FILE_UPLOADED_DIRECT',
        resourceType: 'file',
        resourceId: internalFileId,
        metadata: { name: filename, sizeBytes },
      });

      return this.sanitize(record);
    } catch (err) {
      await QuotaService.releaseReservation(reservation.id);
      await StorageAllocationService.releasePhysicalReservation(physicalReservation.id);
      throw err;
    }
  }

  /**
   * Retrieves file raw binary stream for download / preview.
   */
  static async getFileBinary(userId: string, fileId: string) {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();
    if (file.isFolder) throw new Error('Cannot download folder as raw stream');

    const provider = await storageManager.getProviderForAccount(file.storageAccountId);
    const download = await provider.downloadStream(file.storageObjectId);

    await AuditService.log({
      userId,
      action: 'FILE_DOWNLOADED',
      resourceType: 'file',
      resourceId: file.id,
      metadata: { name: file.name },
    });

    return {
      file: this.sanitize(file),
      download,
    };
  }

  /**
   * Renames a file or folder.
   */
  static async rename(userId: string, fileId: string, newName: string): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    const cleanName = newName.trim();
    if (!cleanName) throw new Error('Name cannot be empty');

    const oldName = file.name;
    file.name = cleanName;
    file.updatedAt = new Date().toISOString();

    await AuditService.log({
      userId,
      action: 'FILE_RENAMED',
      resourceType: file.isFolder ? 'folder' : 'file',
      resourceId: file.id,
      metadata: { oldName, newName: cleanName },
    });

    return this.sanitize(file);
  }

  /**
   * Moves a file or folder to a target parent folder.
   */
  static async move(userId: string, fileId: string, targetParentId: string | null): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    // Prevent moving into itself or cyclic moves
    if (file.isFolder && targetParentId === fileId) {
      throw new Error('Cannot move a folder into itself');
    }

    if (targetParentId) {
      const target = dataStore.files.get(targetParentId);
      if (!target || target.userId !== userId || !target.isFolder) {
        throw new Error('Invalid target destination folder');
      }
    }

    const previousParent = file.parentId;
    file.parentId = targetParentId;
    file.updatedAt = new Date().toISOString();

    await AuditService.log({
      userId,
      action: 'FILE_MOVED',
      resourceType: file.isFolder ? 'folder' : 'file',
      resourceId: file.id,
      metadata: { fromParent: previousParent, toParent: targetParentId },
    });

    return this.sanitize(file);
  }

  /**
   * Copies a file. Duplicates storage object in physical backend and reserves quota & capacity.
   */
  static async copy(userId: string, fileId: string, targetParentId?: string | null): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();
    if (file.isFolder) throw new Error('Folder deep copying will be added in a later phase');

    const userProfile = dataStore.profiles.get(userId);
    const tenantId = userProfile?.tenantId || 'tenant_default_123';

    // 1. Reserve quota for copy
    const reservation = await QuotaService.reserveQuota(userId, file.sizeBytes);
    const copyId = `file_${crypto.randomUUID()}`;

    // 2. Reserve physical capacity
    let physicalReservation;
    try {
      physicalReservation = await StorageAllocationService.reservePhysicalCapacity({
        userId,
        tenantId,
        neededBytes: file.sizeBytes,
        fileId: copyId,
      });
    } catch (allocErr) {
      await QuotaService.releaseReservation(reservation.id);
      throw allocErr;
    }

    try {
      const provider = await storageManager.getProviderForAccount(physicalReservation.storageAccountId);
      const copyName = `Copy of ${file.name}`;
      const copyResult = await provider.copyObject(file.storageObjectId, copyName);

      // 3. Commit quota and physical reservation
      await QuotaService.commitReservation(reservation.id, file.sizeBytes);
      await StorageAllocationService.commitPhysicalUsage(physicalReservation.id, file.sizeBytes);

      const copyRecord: InternalFileRecord = {
        id: copyId,
        userId,
        parentId: targetParentId !== undefined ? targetParentId : file.parentId,
        name: copyName,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        checksumSha256: file.checksumSha256,
        isFolder: false,
        isTrash: false,
        deletedAt: null,
        storageProvider: provider.providerType as any,
        storageAccountId: physicalReservation.storageAccountId,
        storageObjectId: copyResult.newStorageObjectId,
        uploadStatus: 'completed',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dataStore.files.set(copyId, copyRecord);

      await AuditService.log({
        userId,
        action: 'FILE_COPIED',
        resourceType: 'file',
        resourceId: copyId,
        metadata: { originalFileId: file.id, originalName: file.name },
      });

      return this.sanitize(copyRecord);
    } catch (err) {
      await QuotaService.releaseReservation(reservation.id);
      await StorageAllocationService.releasePhysicalReservation(physicalReservation.id);
      throw err;
    }
  }

  /**
   * Soft deletes file or folder (Moves to Trash).
   */
  static async moveToTrash(userId: string, fileId: string): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    const now = new Date().toISOString();
    file.isTrash = true;
    file.deletedAt = now;
    file.updatedAt = now;

    if (file.isFolder) {
      const markDescendantsTrash = (folderId: string) => {
        for (const child of dataStore.files.values()) {
          if (child.userId === userId && child.parentId === folderId && !child.isTrash) {
            child.isTrash = true;
            child.deletedAt = now;
            child.updatedAt = now;
            if (child.isFolder) {
              markDescendantsTrash(child.id);
            }
          }
        }
      };
      markDescendantsTrash(fileId);
    }

    await AuditService.log({
      userId,
      action: 'FILE_TRASHED',
      resourceType: file.isFolder ? 'folder' : 'file',
      resourceId: file.id,
      metadata: { name: file.name },
    });

    return this.sanitize(file);
  }

  /**
   * Restores a file or folder from Trash.
   */
  static async restoreFromTrash(userId: string, fileId: string): Promise<PublicFileItem> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    const now = new Date().toISOString();
    file.isTrash = false;
    file.deletedAt = null;
    file.updatedAt = now;

    if (file.isFolder) {
      const restoreDescendants = (folderId: string) => {
        for (const child of dataStore.files.values()) {
          if (child.userId === userId && child.parentId === folderId && child.isTrash) {
            child.isTrash = false;
            child.deletedAt = null;
            child.updatedAt = now;
            if (child.isFolder) {
              restoreDescendants(child.id);
            }
          }
        }
      };
      restoreDescendants(fileId);
    }

    await AuditService.log({
      userId,
      action: 'FILE_RESTORED',
      resourceType: file.isFolder ? 'folder' : 'file',
      resourceId: file.id,
      metadata: { name: file.name },
    });

    return this.sanitize(file);
  }

  /**
   * Permanently deletes file: purges from physical storage backend and reclaims quota.
   */
  static async permanentDelete(userId: string, fileId: string): Promise<boolean> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    if (file.isFolder) {
      // Recursively delete all descendant files and folders to free their physical blobs and quota
      const children = Array.from(dataStore.files.values()).filter(
        (f) => f.userId === userId && f.parentId === fileId
      );
      for (const child of children) {
        await this.permanentDelete(userId, child.id);
      }
    } else if (file.storageObjectId) {
      try {
        const provider = await storageManager.getProviderForAccount(file.storageAccountId);
        await provider.deleteObject(file.storageObjectId);
      } catch (err) {
        console.warn('Physical storage object deletion note:', err);
      }

      // Reclaim customer quota used storage bytes
      await QuotaService.freeUsedBytes(userId, file.sizeBytes);

      // Reclaim physical storage account capacity
      if (file.storageAccountId) {
        const account = dataStore.storageAccounts.get(file.storageAccountId);
        if (account) {
          account.capacityUsedBytes = Math.max(0, account.capacityUsedBytes - file.sizeBytes);
          account.availableBytes = Math.max(
            0,
            account.capacityTotalBytes - account.capacityUsedBytes - account.capacityReservedBytes
          );
          StorageAllocationService.syncPoolMetrics(account.poolId);
        }
      }
    }

    dataStore.files.delete(fileId);

    // Delete associated share links
    for (const [linkId, link] of dataStore.shareLinks.entries()) {
      if (link.fileId === fileId) {
        dataStore.shareLinks.delete(linkId);
      }
    }

    await AuditService.log({
      userId,
      action: 'FILE_PURGED_PERMANENTLY',
      resourceType: file.isFolder ? 'folder' : 'file',
      resourceId: fileId,
      metadata: { name: file.name, freedBytes: file.sizeBytes },
    });

    return true;
  }

  /**
   * Generates or fetches a public share link for a file.
   */
  static async createShareLink(
    userId: string,
    fileId: string,
    accessType: 'view' | 'download' = 'view',
    expiresInDays?: number
  ): Promise<ShareLink> {
    const file = dataStore.files.get(fileId);
    if (!file) throw new FileNotFoundError();
    if (file.userId !== userId) throw new UnauthorizedAccessError();

    const token = crypto.randomBytes(16).toString('hex');
    const linkId = `share_${crypto.randomUUID()}`;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const shareLink: ShareLink = {
      id: linkId,
      tenantId: file.tenantId || 'tenant_default_123',
      fileId,
      fileName: file.name,
      userId,
      token,
      accessType,
      expiresAt,
      hasPassword: false,
      downloadCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    dataStore.shareLinks.set(token, shareLink);

    await AuditService.log({
      userId,
      action: 'SHARE_LINK_CREATED',
      resourceType: 'share',
      resourceId: linkId,
      metadata: { fileId, fileName: file.name, accessType },
    });

    return shareLink;
  }

  /**
   * Resolves a public share link token.
   */
  static async resolveShareLink(token: string) {
    const link = dataStore.shareLinks.get(token);
    if (!link) throw new FileNotFoundError('Share link not found or expired');

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      throw new Error('This share link has expired');
    }

    const file = dataStore.files.get(link.fileId);
    if (!file || file.isTrash) {
      throw new FileNotFoundError('The shared file is no longer available');
    }

    link.downloadCount += 1;

    return {
      link,
      file: this.sanitize(file),
    };
  }
}
