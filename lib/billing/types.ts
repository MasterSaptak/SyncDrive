import { BillingGateway, PaymentStatus } from '@/types';

export interface PaymentInitiationParams {
  tenantId: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  payerVpa?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitiationResult {
  transactionId: string;
  gateway: BillingGateway;
  amount: number;
  currency: string;
  // Specific to UPI or direct checkout
  payeeVpa?: string;
  qrPayload?: string;
  checkoutUrl?: string;
  instructions?: string;
}

export interface PaymentVerificationParams {
  transactionId: string;
  referenceId: string; // e.g. 12-digit UTR for UPI, or payment_id
  signature?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: PaymentStatus;
  message?: string;
  subscriptionEntitlementGranted?: boolean;
}

export interface WebhookEventResult {
  handled: boolean;
  eventType?: string;
  subscriptionId?: string;
  status?: string;
  message?: string;
}

export interface SubscriptionStatusResult {
  subscriptionId: string;
  status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';
  currentPeriodEnd: string;
  storageEntitlementBytes: number;
}
