import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { QuotaService } from '@/lib/services/quota.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const quota = await QuotaService.getQuota(user.id);
    return NextResponse.json({ quota });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
