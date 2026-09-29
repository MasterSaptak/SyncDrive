export type BillingPeriod = "monthly" | "yearly" | "free";

export interface StoragePlan {
  id: string;
  name: string;
  storageGB: number;
  price: number;
  billingPeriod: BillingPeriod;
  features: string[];
  popular?: boolean;
  highlightText?: string;
}
