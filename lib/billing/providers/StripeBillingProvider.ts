import { BillingProvider } from '../BillingProvider';
import {
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentVerificationParams,
  PaymentVerificationResult,
  WebhookEventResult,
  SubscriptionStatusResult,
} from '../types';
import { BYTES_PER_GIB } from '@/types';

/**
 * StripeBillingProvider (Foundation Skeleton)
 *
 * Future-ready adapter for Stripe international credit card and recurring billing.
 * Business layer does not depend on Stripe SDK directly.
 */
export class StripeBillingProvider implements BillingProvider {
  readonly gateway = 'stripe' as const;

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    const sessionId = `cs_test_${Date.now()}`;
    return {
      transactionId: sessionId,
      gateway: this.gateway,
      amount: params.amount,
      currency: params.currency || 'USD',
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      instructions: 'Stripe Checkout Session initialized.',
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    const isPaymentConfirmed = Boolean(params.referenceId);
    return {
      success: isPaymentConfirmed,
      status: isPaymentConfirmed ? 'approved' : 'rejected',
      subscriptionEntitlementGranted: isPaymentConfirmed,
      message: isPaymentConfirmed
        ? 'Stripe payment intent successfully processed.'
        : 'Stripe verification failed.',
    };
  }

  async handleWebhook(): Promise<WebhookEventResult> {
    return {
      handled: true,
      eventType: 'invoice.payment_succeeded',
      status: 'active',
    };
  }

  async cancelSubscription(): Promise<boolean> {
    return true;
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatusResult> {
    return {
      subscriptionId,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      storageEntitlementBytes: 500 * BYTES_PER_GIB,
    };
  }
}
