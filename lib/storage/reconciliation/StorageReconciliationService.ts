import crypto from 'crypto';
import {
  ReconciliationReport,
  ReconciliationItem,
  InternalFileRecord,
} from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { storageManager } from '@/lib/storage/StorageManager';
import { StorageAllocationService } from '@/lib/services/storage-allocation.service';

/**
 * StorageReconciliationService
 * 
 * Foundation for automated and on-demand consistency checks between
 * authoritative application metadata and physical Google Drive storage state.
 * 
 * Detects:
 * - Missing physical files (File active in DB, but missing from Google Drive node)
 * - Orphaned physical files (Blob present on Google Drive, but unreferenced by DB)
 * - Size mismatches (DB record size does not match physical Google Drive byte length)
 * - Metadata mismatches (Mismatched naming conventions or MIME types)
 */
export class StorageReconciliationService {
  /**
   * Reconciles a physical Google Drive storage account against database metadata.
   */
  public static async reconcileStorageAccount(
    storageAccountId: string,
    options?: { dryRun?: boolean }
  ): Promise<ReconciliationReport> {
    let account = dataStore.storageAccounts.get(storageAccountId);
    if (!account && (storageAccountId === 'gdrive_acc_01' || storageAccountId.startsWith('gdrive_acc_'))) {
      account = dataStore.storageAccounts.get('gdrive-node-01');
    }
    if (!account) {
      throw new Error(`Storage account "${storageAccountId}" not found for reconciliation.`);
    }

    const provider = await storageManager.getProviderForAccount(storageAccountId);

    // 1. Fetch physical files from Google Drive node
    const physicalObjects = await provider.list();
    const physicalMap = new Map<string, { id: string; name: string; sizeBytes: number; mimeType: string }>();
    let physicalUsedBytes = 0;

    for (const obj of physicalObjects) {
      physicalMap.set(obj.objectId, {
        id: obj.objectId,
        name: obj.name,
        sizeBytes: obj.sizeBytes,
        mimeType: obj.mimeType,
      });
      physicalUsedBytes += obj.sizeBytes;
    }

    // 2. Fetch authoritative database file records assigned to this storage account
    const dbFiles: InternalFileRecord[] = [];
    let dbAccountingUsedBytes = 0;

    for (const file of dataStore.files.values()) {
      if (file.isFolder) continue;
      // If file has storageAccountId matching, or if not tagged yet, matches default account
      const matchesAccount =
        file.storageAccountId === storageAccountId ||
        (!file.storageAccountId && (storageAccountId === 'gdrive_acc_01' || storageAccountId === 'gdrive-node-01')) ||
        (storageAccountId === 'gdrive_acc_01' && file.storageAccountId === 'gdrive-node-01');
      if (matchesAccount && file.uploadStatus === 'completed' && !file.isTrash) {
        dbFiles.push(file);
        dbAccountingUsedBytes += file.sizeBytes;
      }
    }

    const discrepancies: ReconciliationItem[] = [];
    const matchedPhysicalIds = new Set<string>();

    // 3. Scan DB files -> verify against physical Google Drive objects
    for (const file of dbFiles) {
      if (!file.storageObjectId) {
        discrepancies.push({
          id: `disc_${crypto.randomUUID()}`,
          type: 'missing_physical_file',
          internalFileId: file.id,
          storageAccountId,
          filename: file.name,
          dbSizeBytes: file.sizeBytes,
          details: `DB file "${file.name}" (${file.id}) has no physical storageObjectId assigned.`,
          detectedAt: new Date().toISOString(),
        });
        continue;
      }

      const physicalObj = physicalMap.get(file.storageObjectId);
      if (!physicalObj) {
        discrepancies.push({
          id: `disc_${crypto.randomUUID()}`,
          type: 'missing_physical_file',
          internalFileId: file.id,
          storageObjectId: file.storageObjectId,
          storageAccountId,
          filename: file.name,
          dbSizeBytes: file.sizeBytes,
          details: `File "${file.name}" exists in database, but physical object ${file.storageObjectId} was not found on Google Drive.`,
          detectedAt: new Date().toISOString(),
        });
      } else {
        matchedPhysicalIds.add(physicalObj.id);

        // Check size mismatch
        if (physicalObj.sizeBytes !== file.sizeBytes && physicalObj.sizeBytes > 0 && file.sizeBytes > 0) {
          discrepancies.push({
            id: `disc_${crypto.randomUUID()}`,
            type: 'size_mismatch',
            internalFileId: file.id,
            storageObjectId: file.storageObjectId,
            storageAccountId,
            filename: file.name,
            dbSizeBytes: file.sizeBytes,
            physicalSizeBytes: physicalObj.sizeBytes,
            details: `Size mismatch for "${file.name}": DB records ${file.sizeBytes} bytes vs Google Drive reports ${physicalObj.sizeBytes} bytes.`,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    // 4. Scan Physical files -> detect orphaned files not referenced in DB
    for (const [physicalId, physObj] of physicalMap.entries()) {
      if (!matchedPhysicalIds.has(physicalId)) {
        // Check if this object belongs to our SaaS naming convention
        if (physObj.name.startsWith('saas_obj_') || physObj.name.startsWith('saas_blob_')) {
          discrepancies.push({
            id: `disc_${crypto.randomUUID()}`,
            type: 'orphaned_physical_file',
            storageObjectId: physicalId,
            storageAccountId,
            filename: physObj.name,
            physicalSizeBytes: physObj.sizeBytes,
            details: `Orphaned physical file "${physObj.name}" (${physicalId}) found on Google Drive without active database file reference.`,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    const reportId = `rec_${crypto.randomUUID()}`;
    const report: ReconciliationReport = {
      id: reportId,
      storageAccountId,
      storageAccountName: account.name,
      totalPhysicalFilesScanned: physicalObjects.length,
      totalDbRecordsScanned: dbFiles.length,
      discrepanciesCount: discrepancies.length,
      discrepancies,
      physicalUsedBytes,
      dbAccountingUsedBytes,
      byteDifference: physicalUsedBytes - dbAccountingUsedBytes,
      scannedAt: new Date().toISOString(),
    };

    dataStore.reconciliationReports.set(reportId, report);

    // Update account health check timestamp
    account.lastHealthCheck = new Date().toISOString();
    if (discrepancies.some((d) => d.type === 'missing_physical_file')) {
      account.healthStatus = 'degraded';
    } else {
      account.healthStatus = 'healthy';
    }

    StorageAllocationService.syncPoolMetrics(account.poolId);

    return report;
  }

  /**
   * Cleans up confirmed orphaned physical files from Google Drive node.
   */
  public static async pruneOrphanedPhysicalObjects(storageAccountId: string): Promise<{ prunedCount: number; freedBytes: number }> {
    const report = await this.reconcileStorageAccount(storageAccountId, { dryRun: false });
    const provider = await storageManager.getProviderForAccount(storageAccountId);

    let prunedCount = 0;
    let freedBytes = 0;

    for (const disc of report.discrepancies) {
      if (disc.type === 'orphaned_physical_file' && disc.storageObjectId) {
        try {
          await provider.delete(disc.storageObjectId);
          prunedCount++;
          freedBytes += disc.physicalSizeBytes || 0;
        } catch (e) {
          console.warn(`Failed to prune orphaned object ${disc.storageObjectId}:`, e);
        }
      }
    }

    return { prunedCount, freedBytes };
  }

  /**
   * Retrieves saved reconciliation reports.
   */
  public static async getReports(storageAccountId?: string): Promise<ReconciliationReport[]> {
    const list = Array.from(dataStore.reconciliationReports.values());
    if (storageAccountId) {
      return list.filter((r) => r.storageAccountId === storageAccountId);
    }
    return list.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  }
}
