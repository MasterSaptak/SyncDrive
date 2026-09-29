import crypto from 'crypto';
import { LogicalQuota, UploadReservation, BYTES_PER_GIB } from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { asyncLock } from '@/lib/utils/concurrency';

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class QuotaService {
  /**
   * Retrieves the logical storage quota and usage accounting for a customer.
   * Multi-tenant aware: associates tenantId and checks subscription entitlement.
   */
  static async getQuota(userId: string): Promise<LogicalQuota> {
    const profile = dataStore.profiles.get(userId);
    const tenantId = profile?.tenantId || 'tenant_default_123';
    const planId = profile?.currentPlanId || 'plan_100gb';
    const plan = dataStore.plans.find((p) => p.id === planId) || dataStore.plans[0];

    // Find active subscription & entitlement
    let subscription = Array.from(dataStore.subscriptions.values()).find(
      (s) => s.userId === userId || s.tenantId === tenantId
    );

    if (!subscription) {
      subscription = {
        id: `sub_${userId}`,
        tenantId,
        userId,
        planId: plan.id,
        status: 'active',
        storageEntitlementBytes: plan.quotaBytes,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dataStore.subscriptions.set(subscription.id, subscription);
    }

    // Storage Usage Accounting
    let usage = dataStore.storageUsage.get(userId);
    if (!usage) {
      usage = {
        id: `usage_${userId}`,
        tenantId,
        userId,
        usedBytes: 0,
        reservedBytes: 0,
        fileCount: 0,
        folderCount: 0,
        lastCalculatedAt: new Date().toISOString(),
      };
      dataStore.storageUsage.set(userId, usage);
    }

    // Clean up expired reservations
    this.cleanupExpiredReservations(userId);

    const totalEntitlement = subscription.storageEntitlementBytes || plan.quotaBytes;
    const available = Math.max(0, totalEntitlement - usage.usedBytes - usage.reservedBytes);

    return {
      userId,
      tenantId,
      planId: plan.id,
      planName: plan.name,
      quotaBytes: totalEntitlement,
      usedBytes: usage.usedBytes,
      reservedBytes: usage.reservedBytes,
      availableBytes: available,
      subscriptionStatus: subscription.status,
      updatedAt: usage.lastCalculatedAt,
    };
  }

  /**
   * Pre-allocates bytes for an incoming upload.
   * availableBytes = quotaBytes - usedBytes - reservedBytes
   */
  static async reserveQuota(userId: string, expectedSizeBytes: number): Promise<UploadReservation> {
    return asyncLock.withLock(`quota:${userId}`, async () => {
      const quota = await this.getQuota(userId);

      if (expectedSizeBytes > quota.availableBytes) {
        const neededMB = (expectedSizeBytes / (1024 * 1024)).toFixed(2);
        const availMB = (quota.availableBytes / (1024 * 1024)).toFixed(2);
        throw new QuotaExceededError(
          `Insufficient storage quota. Requested: ${neededMB} MB, Available: ${availMB} MB.`
        );
      }

      const reservationId = `res_${crypto.randomUUID()}`;
      const reservation: UploadReservation = {
        id: reservationId,
        tenantId: quota.tenantId,
        userId,
        expectedSizeBytes,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      dataStore.reservations.set(reservationId, reservation);

      // Update usage accounting
      const usage = dataStore.storageUsage.get(userId);
      if (usage) {
        usage.reservedBytes += expectedSizeBytes;
        usage.lastCalculatedAt = new Date().toISOString();
      }

      return reservation;
    });
  }

  /**
   * Commits reserved bytes into used_bytes once upload succeeds.
   */
  static async commitReservation(reservationId: string, actualSizeBytes: number): Promise<void> {
    const reservation = dataStore.reservations.get(reservationId);
    if (!reservation || reservation.status !== 'active') {
      return;
    }

    return asyncLock.withLock(`quota:${reservation.userId}`, async () => {
      const usage = dataStore.storageUsage.get(reservation.userId);
      if (usage) {
        usage.reservedBytes = Math.max(0, usage.reservedBytes - reservation.expectedSizeBytes);
        usage.usedBytes += actualSizeBytes;
        usage.fileCount += 1;
        usage.lastCalculatedAt = new Date().toISOString();
      }

      reservation.status = 'committed';
    });
  }

  /**
   * Releases reserved bytes if an upload fails or is cancelled.
   */
  static async releaseReservation(reservationId: string): Promise<void> {
    const reservation = dataStore.reservations.get(reservationId);
    if (!reservation || reservation.status !== 'active') {
      return;
    }

    return asyncLock.withLock(`quota:${reservation.userId}`, async () => {
      const usage = dataStore.storageUsage.get(reservation.userId);
      if (usage) {
        usage.reservedBytes = Math.max(0, usage.reservedBytes - reservation.expectedSizeBytes);
        usage.lastCalculatedAt = new Date().toISOString();
      }

      reservation.status = 'released';
    });
  }

  /**
   * Decrements used bytes when files are permanently purged.
   */
  static async freeUsedBytes(userId: string, bytesToFree: number): Promise<void> {
    return asyncLock.withLock(`quota:${userId}`, async () => {
      const usage = dataStore.storageUsage.get(userId);
      if (usage) {
        usage.usedBytes = Math.max(0, usage.usedBytes - bytesToFree);
        usage.fileCount = Math.max(0, usage.fileCount - 1);
        usage.lastCalculatedAt = new Date().toISOString();
      }
    });
  }

  /**
   * Upgrades or updates the user's storage plan and subscription entitlement.
   */
  static async upgradePlan(userId: string, planId: string): Promise<LogicalQuota> {
    const plan = dataStore.plans.find((p) => p.id === planId);
    if (!plan) {
      throw new Error(`Plan ${planId} does not exist`);
    }

    const profile = dataStore.profiles.get(userId);
    if (profile) {
      profile.currentPlanId = plan.id;
    }

    // Update subscription entitlement
    let subscription = Array.from(dataStore.subscriptions.values()).find(
      (s) => s.userId === userId
    );

    if (subscription) {
      subscription.planId = plan.id;
      subscription.storageEntitlementBytes = plan.quotaBytes;
      subscription.updatedAt = new Date().toISOString();
    }

    // Update or insert storage allocation for cluster pool overview
    const allocId = `alloc_${userId}`;
    const existingAlloc = dataStore.storageAllocations.get(allocId);
    if (existingAlloc) {
      existingAlloc.allocatedBytes = plan.quotaBytes;
      existingAlloc.updatedAt = new Date().toISOString();
    } else {
      dataStore.storageAllocations.set(allocId, {
        id: allocId,
        tenantId: profile?.tenantId || `tenant_${userId}`,
        userId,
        allocatedBytes: plan.quotaBytes,
        allocationType: 'plan_quota',
        isActive: true,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const { AuditService } = await import('./audit.service');
    await AuditService.log({
      tenantId: profile?.tenantId,
      userId,
      action: 'PLAN_UPGRADED',
      resourceType: 'subscription',
      resourceId: plan.id,
      metadata: { planId: plan.id, planName: plan.name, quotaBytes: plan.quotaBytes },
    });

    return this.getQuota(userId);
  }

  private static cleanupExpiredReservations(userId: string) {
    const now = Date.now();
    for (const res of dataStore.reservations.values()) {
      if (res.userId === userId && res.status === 'active' && new Date(res.expiresAt).getTime() < now) {
        res.status = 'expired';
        const usage = dataStore.storageUsage.get(userId);
        if (usage) {
          usage.reservedBytes = Math.max(0, usage.reservedBytes - res.expectedSizeBytes);
        }
      }
    }
  }
}
