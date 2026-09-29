import { BillingProvider } from '../BillingProvider';
import {
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentVerificationParams,
  PaymentVerificationResult,
  WebhookEventResult,
  SubscriptionStatusResult,
} from '../types';
import { dataStore } from '@/lib/db/data-store';
import { BYTES_PER_GIB } from '@/types';

export class ManualUpiBillingProvider implements BillingProvider {
  readonly gateway = 'manual_upi' as const;

  // Default merchant UPI configuration
  private payeeVpa = process.env.MERCHANT_UPI_VPA || 'syncstorage@upi';
  private payeeName = 'SyncDrive Cloud Storage';

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const plan = dataStore.plans.find((p) => p.id === params.planId);
    const amount = plan ? plan.monthlyPrice : params.amount;

    // Standard NPCI UPI URI Scheme
    const qrPayload = `upi://pay?pa=${encodeURIComponent(this.payeeVpa)}&pn=${encodeURIComponent(
      this.payeeName
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`SyncDrive_${params.planId}`)}`;

    return {
      transactionId,
      gateway: this.gateway,
      amount,
      currency: 'INR',
      payeeVpa: this.payeeVpa,
      qrPayload,
      instructions: `Please send ₹${amount} via any UPI app (GPay, PhonePe, Paytm) to ${this.payeeVpa} and submit the 12-digit UTR/Reference number.`,
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    // Basic verification of 12-digit UPI UTR
    const utrRegex = /^[0-9]{12}$/;
    const isValidUtr = utrRegex.test(params.referenceId.trim());

    if (!isValidUtr && params.referenceId.length < 8) {
      return {
        success: false,
        status: 'rejected',
        message: 'Invalid UPI reference number. Please provide the 12-digit transaction UTR.',
      };
    }

    return {
      success: true,
      status: 'submitted',
      message: 'Payment reference submitted successfully. Our accounting team will verify and activate your storage entitlement.',
      subscriptionEntitlementGranted: false, // Entitlement granted upon admin confirmation or instant trial
    };
  }

  async handleWebhook(): Promise<WebhookEventResult> {
    // Manual UPI does not provide automated push webhooks; bank statements are matched manually
    return {
      handled: true,
      eventType: 'manual_verification_noop',
      message: 'Manual UPI transactions are reconciled via UTR submission.',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const sub = dataStore.subscriptions.get(subscriptionId);
    if (sub) {
      sub.status = 'cancelled';
      sub.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatusResult> {
    const sub = dataStore.subscriptions.get(subscriptionId);
    if (!sub) {
      return {
        subscriptionId,
        status: 'expired',
        currentPeriodEnd: new Date().toISOString(),
        storageEntitlementBytes: 100 * BYTES_PER_GIB,
      };
    }

    return {
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      storageEntitlementBytes: sub.storageEntitlementBytes,
    };
  }
}
