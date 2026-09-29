import { NextResponse } from 'next/server';
import { PlanService } from '@/lib/services/plan.service';

export async function GET() {
  try {
    const plans = await PlanService.getActivePlans();
    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch plans' }, { status: 500 });
  }
}
