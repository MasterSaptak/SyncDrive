import { BillingGateway } from '@/types';
import {
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentVerificationParams,
  PaymentVerificationResult,
  WebhookEventResult,
  SubscriptionStatusResult,
} from './types';

/**
 * BillingProvider Interface
 *
 * Pluggable contract for subscription payment gateways.
 * The core SaaS domain logic and business layer depend exclusively on this interface,
 * preventing tight coupling to any specific provider (Manual UPI, Razorpay, or Stripe).
 */
export interface BillingProvider {
  readonly gateway: BillingGateway;

  /**
   * Initializes a payment or checkout attempt for a plan subscription.
   */
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;

  /**
   * Verifies payment submission (e.g. validates UPI UTR or provider cryptographic signature).
   */
  verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult>;

  /**
   * Handles asynchronous incoming webhooks from the payment gateway.
   */
  handleWebhook(payload: unknown, signature?: string): Promise<WebhookEventResult>;

  /**
   * Cancels recurring subscription or revokes pending billing.
   */
  cancelSubscription(subscriptionId: string): Promise<boolean>;

  /**
   * Retrieves active status and period limits from the billing engine.
   */
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatusResult>;
}
