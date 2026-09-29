import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const submissions = Array.from(dataStore.paymentSubmissions.values()).map((p) => {
    const user = dataStore.profiles.get(p.userId);
    const plan = dataStore.plans.find((pl) => pl.id === p.planId);
    return {
      id: p.id,
      userId: p.userId,
      userEmail: user?.email || 'customer@syncdrive.io',
      userName: user?.fullName || 'Customer User',
      planId: p.planId,
      planName: plan?.name || p.planName,
      amount: p.amount,
      amountFormatted: `₹${p.amount}`,
      currency: p.currency,
      referenceId: p.referenceId || p.upiReferenceId,
      payerVpa: p.payerVpa || 'customer@upi',
      payeeVpa: p.payeeVpa,
      status: p.status,
      adminNotes: p.adminNotes,
      reviewedAt: p.reviewedAt,
      submittedAt: p.submittedAt,
    };
  });

  // Sort newest first
  submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Also include recent gateway transaction records
  const records = Array.from(dataStore.paymentRecords.values()).map((r) => {
    const user = dataStore.profiles.get(r.userId);
    const plan = dataStore.plans.find((pl) => pl.id === r.planId);
    return {
      id: r.id,
      user: user?.email || 'customer@syncdrive.io',
      userName: user?.fullName || 'Customer',
      plan: plan?.name || 'Pro Tier',
      amount: `₹${r.amount}`,
      status: r.status,
      date: new Date(r.createdAt).toLocaleDateString(),
      createdAt: r.createdAt,
    };
  });
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Compute MRR from active subscriptions
  let totalMrrInr = 0;
  for (const s of dataStore.subscriptions.values()) {
    if (s.status === 'active') {
      const plan = dataStore.plans.find((p) => p.id === s.planId);
      if (plan) totalMrrInr += plan.monthlyPrice;
    }
  }

  return NextResponse.json(
    {
      submissions,
      transactions: records,
      mrr: {
        amountInr: totalMrrInr,
        amountFormatted: `₹${totalMrrInr.toLocaleString()}`,
        activeSubscribers: dataStore.subscriptions.size,
      },
    },
    { headers: corsHeaders() }
  );
}
