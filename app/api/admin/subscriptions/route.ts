import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const subscriptions = Array.from(dataStore.subscriptions.values()).map((s) => {
    const user = dataStore.profiles.get(s.userId);
    const plan = dataStore.plans.find((p) => p.id === s.planId);
    return {
      id: s.id,
      userId: s.userId,
      userEmail: user?.email || 'customer@syncdrive.io',
      userName: user?.fullName || 'Customer User',
      planId: s.planId,
      planName: plan?.name || 'Standard Tier',
      planQuotaGB: Math.round((plan?.quotaBytes || s.storageEntitlementBytes) / (1024 * 1024 * 1024)),
      monthlyPriceUSD: Math.round((plan?.monthlyPrice || 199) / 25),
      monthlyPriceINR: plan?.monthlyPrice || 199,
      status: s.status,
      billingPeriod: 'monthly',
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    };
  });

  return NextResponse.json(subscriptions, { headers: corsHeaders() });
}
