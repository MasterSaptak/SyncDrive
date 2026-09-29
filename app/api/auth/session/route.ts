import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { QuotaService } from '@/lib/services/quota.service';
import { PlanService } from '@/lib/services/plan.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const quota = await QuotaService.getQuota(user.id);
    const plans = await PlanService.getActivePlans();
    const plan = plans.find((p) => p.id === user.currentPlanId) || plans[0];

    return NextResponse.json({
      user,
      quota,
      plan,
      plans,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
