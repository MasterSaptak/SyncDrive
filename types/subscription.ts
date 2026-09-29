export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName?: string;
  storageGB?: number;
  status: SubscriptionStatus;
  startedAt: string;
  startDate?: string;
  renewalAt?: string;
  expiresAt?: string;
  endDate?: string;
  billingCycle?: "monthly" | "yearly";
  billingPeriod?: string;
  price?: number;
  autoRenew?: boolean;
}
