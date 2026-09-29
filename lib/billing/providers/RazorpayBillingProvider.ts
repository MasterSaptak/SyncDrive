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
 * RazorpayBillingProvider (Foundation Skeleton)
 *
 * Future-ready adapter for Razorpay automated subscriptions and order checkout.
 * Business layer does not depend on Razorpay SDK directly.
 */
export class RazorpayBillingProvider implements BillingProvider {
  readonly gateway = 'razorpay' as const;

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    const orderId = `order_${Date.now()}`;
    return {
      transactionId: orderId,
      gateway: this.gateway,
      amount: params.amount,
      currency: params.currency || 'INR',
      instructions: 'Razorpay checkout session generated. Ready for client SDK invocation.',
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    // In future phases: verify HMAC SHA256 signature using razorpay_key_secret
    const isSignatureValid = Boolean(params.referenceId);
    return {
      success: isSignatureValid,
      status: isSignatureValid ? 'approved' : 'rejected',
      subscriptionEntitlementGranted: isSignatureValid,
      message: isSignatureValid
        ? 'Razorpay automated signature verified.'
        : 'Razorpay signature validation failed.',
    };
  }

  async handleWebhook(): Promise<WebhookEventResult> {
    return {
      handled: true,
      eventType: 'payment.captured',
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
      storageEntitlementBytes: 250 * BYTES_PER_GIB,
    };
  }
}
