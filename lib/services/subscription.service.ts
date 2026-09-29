import { SubscriptionRecord, SubscriptionStatus, BYTES_PER_GIB } from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { PlanService } from './plan.service';

export class SubscriptionService {
  /**
   * Retrieves active subscription for a tenant/user.
   */
  static async getSubscription(userId: string): Promise<SubscriptionRecord> {
    const profile = dataStore.profiles.get(userId);
    const tenantId = profile?.tenantId || 'tenant_default_123';

    let sub = Array.from(dataStore.subscriptions.values()).find(
      (s) => s.userId === userId || s.tenantId === tenantId
    );

    if (!sub) {
      const defaultPlan = (await PlanService.getActivePlans())[0];
      sub = {
        id: `sub_${userId}`,
        tenantId,
        userId,
        planId: defaultPlan.id,
        status: 'active',
        storageEntitlementBytes: defaultPlan.quotaBytes,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dataStore.subscriptions.set(sub.id, sub);
    }

    return sub;
  }

  /**
   * Updates subscription status while managing storage entitlement separately.
   * E.g. A subscription may be 'past_due' during grace period without instantly dropping entitlement.
   */
  static async updateStatus(
    subscriptionId: string,
    newStatus: SubscriptionStatus,
    adjustEntitlement: boolean = false
  ): Promise<SubscriptionRecord> {
    const sub = dataStore.subscriptions.get(subscriptionId);
    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    sub.status = newStatus;
    sub.updatedAt = new Date().toISOString();

    if (adjustEntitlement) {
      if (newStatus === 'expired' || newStatus === 'suspended') {
        // Drop to base 100 GiB starter entitlement
        sub.storageEntitlementBytes = 100 * BYTES_PER_GIB;
      }
    }

    return sub;
  }
}
