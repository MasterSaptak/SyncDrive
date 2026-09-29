import crypto from 'crypto';
import { PaymentSubmission, PaymentRecord } from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { QuotaService } from './quota.service';
import { AuditService } from './audit.service';
import { billingManager } from '@/lib/billing/BillingManager';

export class PaymentService {
  /**
   * Submits a manual UPI payment for verification via BillingProvider abstraction.
   */
  static async submitUPIPayment(params: {
    userId: string;
    planId: string;
    amountInr: number;
    upiReferenceId: string;
    userVpa?: string;
  }): Promise<PaymentSubmission> {
    const plan = dataStore.plans.find((p) => p.id === params.planId);
    if (!plan) {
      throw new Error(`Invalid plan: ${params.planId}`);
    }

    const cleanRef = params.upiReferenceId.trim();
    if (!cleanRef || cleanRef.length < 6) {
      throw new Error('Please enter a valid 12-digit UPI reference ID or UTR number');
    }

    const profile = dataStore.profiles.get(params.userId);
    const tenantId = profile?.tenantId || 'tenant_default_123';

    // Verify submission through the billing provider contract
    const provider = billingManager.getProvider('manual_upi');
    const verification = await provider.verifyPayment({
      transactionId: `tx_${Date.now()}`,
      referenceId: cleanRef,
    });

    const paymentId = `pay_${crypto.randomUUID()}`;
    const paymentSubmission: PaymentSubmission = {
      id: paymentId,
      tenantId,
      userId: params.userId,
      planId: plan.id,
      planName: plan.name,
      amount: params.amountInr,
      currency: 'INR',
      method: 'manual_upi',
      referenceId: cleanRef,
      payerVpa: params.userVpa?.trim(),
      payeeVpa: process.env.MERCHANT_UPI_VPA || 'syncstorage@upi',
      status: verification.status || 'submitted',
      submittedAt: new Date().toISOString(),
    };

    dataStore.paymentSubmissions.set(paymentId, paymentSubmission);

    // Also create corresponding payment record
    const recordId = `rec_${crypto.randomUUID()}`;
    const record: PaymentRecord = {
      id: recordId,
      tenantId,
      userId: params.userId,
      planId: plan.id,
      gateway: 'manual_upi',
      gatewayTransactionId: cleanRef,
      amount: params.amountInr,
      currency: 'INR',
      status: 'pending',
      metadata: { submissionId: paymentId, payerVpa: params.userVpa },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dataStore.paymentRecords.set(recordId, record);

    await AuditService.log({
      tenantId,
      userId: params.userId,
      action: 'PAYMENT_SUBMITTED_UPI',
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: { planId: plan.id, amount: params.amountInr, referenceId: cleanRef },
    });

    return paymentSubmission;
  }

  /**
   * Lists payment transactions submitted by a user.
   */
  static async getUserPayments(userId: string): Promise<PaymentSubmission[]> {
    return Array.from(dataStore.paymentSubmissions.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  /**
   * Approves a payment (usable by admin or instant verification).
   * Automatically upgrades user logical quota and assigns new plan tier.
   */
  static async approvePayment(paymentId: string): Promise<PaymentSubmission> {
    const payment = dataStore.paymentSubmissions.get(paymentId);
    if (!payment) {
      throw new Error('Payment record not found');
    }

    payment.status = 'approved';
    payment.reviewedAt = new Date().toISOString();
    payment.adminNotes = 'Payment verified and credited';

    // Upgrade the logical quota and entitlement
    await QuotaService.upgradePlan(payment.userId, payment.planId);

    // Update payment record status
    for (const rec of dataStore.paymentRecords.values()) {
      if (rec.metadata?.submissionId === paymentId) {
        rec.status = 'succeeded';
        rec.updatedAt = new Date().toISOString();
      }
    }

    await AuditService.log({
      tenantId: payment.tenantId,
      userId: payment.userId,
      action: 'PAYMENT_APPROVED_QUOTA_UPGRADED',
      resourceType: 'payment',
      resourceId: payment.id,
      metadata: { planId: payment.planId, amount: payment.amount },
    });

    return payment;
  }
}
