import crypto from 'crypto';
import {
  InternalStorageAccount,
  StoragePool,
  PhysicalCapacityReservation,
  StoragePoolMetrics,
} from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { asyncLock } from '@/lib/utils/concurrency';
import { StorageAccountCapacityExceededError } from '@/lib/storage/errors/GoogleDriveErrorTranslator';

export class InsufficientPhysicalStorageError extends StorageAccountCapacityExceededError {
  constructor(message = 'No storage accounts in the pool have sufficient available capacity.') {
    super(message);
    this.name = 'InsufficientPhysicalStorageError';
  }
}

/**
 * StorageAllocationService
 * 
 * Orchestrates multi-node physical storage capacity management across Google Drive accounts.
 * - Concurrency-safe capacity checks and reservations (preventing pool & node overfills)
 * - Load-balanced storage account selection (best-fit/highest-available capacity)
 * - Transactional reservation, commit, release, and rollback lifecycles
 * - Abstracted behind the SaaS storage layer: customer never sees account IDs or Google credentials
 */
export class StorageAllocationService {
  /**
   * Recalculates aggregate metrics for a pool from all its member accounts.
   */
  public static syncPoolMetrics(poolId: string): StoragePool | null {
    const pool = dataStore.infrastructurePools.get(poolId);
    if (!pool) return null;

    let total = 0;
    let used = 0;
    let reserved = 0;

    for (const accId of pool.accountIds) {
      const acc = dataStore.storageAccounts.get(accId);
      if (acc) {
        total += acc.capacityTotalBytes;
        used += acc.capacityUsedBytes;
        reserved += acc.capacityReservedBytes;
        acc.availableBytes = Math.max(0, acc.capacityTotalBytes - acc.capacityUsedBytes - acc.capacityReservedBytes);
      }
    }

    pool.capacityTotalBytes = total;
    pool.capacityUsedBytes = used;
    pool.capacityReservedBytes = reserved;
    pool.availableBytes = Math.max(0, total - used - reserved);
    pool.updatedAt = new Date().toISOString();

    return pool;
  }

  /**
   * Retrieves all infrastructure pools with up-to-date capacity accounting.
   */
  public static async getPools(): Promise<StoragePool[]> {
    const pools: StoragePool[] = [];
    for (const pool of dataStore.infrastructurePools.values()) {
      this.syncPoolMetrics(pool.id);
      pools.push(pool);
    }
    return pools;
  }

  /**
   * Retrieves detailed metrics for a specific pool.
   */
  public static async getPoolMetrics(poolId: string): Promise<StoragePoolMetrics | null> {
    const pool = this.syncPoolMetrics(poolId);
    if (!pool) return null;

    const accounts: InternalStorageAccount[] = [];
    for (const accId of pool.accountIds) {
      const acc = dataStore.storageAccounts.get(accId);
      if (acc) accounts.push(acc);
    }

    return {
      pool,
      accounts,
      totalCapacityBytes: pool.capacityTotalBytes,
      usedBytes: pool.capacityUsedBytes,
      reservedBytes: pool.capacityReservedBytes,
      availableBytes: pool.availableBytes,
    };
  }

  /**
   * Internal operator view of storage accounts.
   * NEVER exposed to customer endpoints.
   */
  public static async getStorageAccounts(poolId?: string): Promise<InternalStorageAccount[]> {
    const list = Array.from(dataStore.storageAccounts.values());
    if (poolId) {
      return list.filter((a) => a.poolId === poolId);
    }
    return list;
  }

  /**
   * Retrieves single storage account by ID.
   */
  public static async getAccount(accountId: string): Promise<InternalStorageAccount | null> {
    return dataStore.storageAccounts.get(accountId) || null;
  }

  /**
   * Checks if overall storage infrastructure has sufficient unreserved capacity.
   */
  public static async checkAvailableStorage(
    neededBytes: number,
    poolId = 'pool_gdrive_primary'
  ): Promise<{ isAvailable: boolean; availableBytes: number; candidateCount: number }> {
    const pool = this.syncPoolMetrics(poolId);
    if (!pool || pool.status !== 'active') {
      return { isAvailable: false, availableBytes: 0, candidateCount: 0 };
    }

    let candidates = 0;
    for (const accId of pool.accountIds) {
      const acc = dataStore.storageAccounts.get(accId);
      if (
        acc &&
        acc.status === 'active' &&
        acc.healthStatus !== 'unhealthy' &&
        acc.availableBytes >= neededBytes
      ) {
        candidates++;
      }
    }

    return {
      isAvailable: candidates > 0 && pool.availableBytes >= neededBytes,
      availableBytes: pool.availableBytes,
      candidateCount: candidates,
    };
  }

  /**
   * Internal account selector without lock acquisition (caller must hold lock or call selectStorageAccount).
   */
  private static selectStorageAccountInternal(
    neededBytes: number,
    preferredPoolId = 'pool_gdrive_primary'
  ): { account: InternalStorageAccount; pool: StoragePool } {
    const pool = this.syncPoolMetrics(preferredPoolId);
    if (!pool || pool.status !== 'active') {
      throw new InsufficientPhysicalStorageError(
        `Physical storage pool "${preferredPoolId}" is inactive or unavailable.`
      );
    }

    const eligibleAccounts: InternalStorageAccount[] = [];
    for (const accId of pool.accountIds) {
      const acc = dataStore.storageAccounts.get(accId);
      if (
        acc &&
        acc.status === 'active' &&
        acc.healthStatus !== 'unhealthy' &&
        acc.availableBytes >= neededBytes
      ) {
        eligibleAccounts.push(acc);
      }
    }

    if (eligibleAccounts.length === 0) {
      throw new InsufficientPhysicalStorageError(
        `Insufficient physical storage capacity across all nodes in pool ${preferredPoolId}. Needed: ${(
          neededBytes /
          (1024 * 1024)
        ).toFixed(2)} MB.`
      );
    }

    // Sort by highest available capacity (load distribution across multiple accounts)
    eligibleAccounts.sort((a, b) => b.availableBytes - a.availableBytes);
    const selectedAccount = eligibleAccounts[0];

    return { account: selectedAccount, pool };
  }

  /**
   * Selects a storage account from the pool using load balancing.
   * Chooses the active, healthy account with highest available bytes (capacity - used - reserved).
   */
  public static async selectStorageAccount(
    neededBytes: number,
    preferredPoolId = 'pool_gdrive_primary'
  ): Promise<{ account: InternalStorageAccount; pool: StoragePool }> {
    return asyncLock.withLock('storage:allocation', async () => {
      return this.selectStorageAccountInternal(neededBytes, preferredPoolId);
    });
  }

  /**
   * Reserves capacity atomically on the chosen storage account and pool.
   * Concurrency-safe: serialized through asyncLock to eliminate race conditions.
   */
  public static async reservePhysicalCapacity(params: {
    userId: string;
    tenantId: string;
    neededBytes: number;
    fileId: string;
    preferredPoolId?: string;
  }): Promise<PhysicalCapacityReservation> {
    return asyncLock.withLock('storage:allocation', async () => {
      const poolId = params.preferredPoolId || 'pool_gdrive_primary';
      const { account, pool } = this.selectStorageAccountInternal(params.neededBytes, poolId);

      // Deduct available bytes by incrementing reservedBytes
      account.capacityReservedBytes += params.neededBytes;
      account.availableBytes = Math.max(
        0,
        account.capacityTotalBytes - account.capacityUsedBytes - account.capacityReservedBytes
      );
      account.updatedAt = new Date().toISOString();

      // Sync pool reserved counter
      this.syncPoolMetrics(pool.id);

      const reservationId = `phys_res_${crypto.randomUUID()}`;
      const reservation: PhysicalCapacityReservation = {
        id: reservationId,
        storageAccountId: account.id,
        poolId: pool.id,
        reservedBytes: params.neededBytes,
        internalFileId: params.fileId,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      dataStore.physicalReservations.set(reservationId, reservation);
      return reservation;
    });
  }

  /**
   * Commits reserved physical capacity into used bytes upon successful upload.
   */
  public static async commitPhysicalUsage(reservationId: string, actualBytes: number): Promise<void> {
    return asyncLock.withLock('storage:allocation', async () => {
      const reservation = dataStore.physicalReservations.get(reservationId);
      if (!reservation) {
        console.warn(`[StorageAllocationService] Physical reservation not found: ${reservationId}`);
        return;
      }

      if (reservation.status === 'committed') return;

      const account = dataStore.storageAccounts.get(reservation.storageAccountId);
      if (account) {
        account.capacityReservedBytes = Math.max(0, account.capacityReservedBytes - reservation.reservedBytes);
        account.capacityUsedBytes += actualBytes;
        account.availableBytes = Math.max(
          0,
          account.capacityTotalBytes - account.capacityUsedBytes - account.capacityReservedBytes
        );
        account.updatedAt = new Date().toISOString();
      }

      reservation.status = 'committed';
      this.syncPoolMetrics(reservation.poolId);
    });
  }

  /**
   * Releases an uncommitted physical reservation (e.g. on client abort or network failure).
   */
  public static async releasePhysicalReservation(reservationId: string): Promise<void> {
    return asyncLock.withLock('storage:allocation', async () => {
      const reservation = dataStore.physicalReservations.get(reservationId);
      if (!reservation) return;

      if (reservation.status !== 'active') return;

      const account = dataStore.storageAccounts.get(reservation.storageAccountId);
      if (account) {
        account.capacityReservedBytes = Math.max(0, account.capacityReservedBytes - reservation.reservedBytes);
        account.availableBytes = Math.max(
          0,
          account.capacityTotalBytes - account.capacityUsedBytes - account.capacityReservedBytes
        );
        account.updatedAt = new Date().toISOString();
      }

      reservation.status = 'released';
      this.syncPoolMetrics(reservation.poolId);
    });
  }

  /**
   * Alias for rollback.
   */
  public static async rollbackPhysicalReservation(reservationId: string): Promise<void> {
    return this.releasePhysicalReservation(reservationId);
  }
}
