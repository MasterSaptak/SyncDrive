import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { DeviceSessionService } from '@/lib/services/device-session.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const liveUsers = DeviceSessionService.getLiveActiveUsers();

  return NextResponse.json(
    {
      onlineCount: liveUsers.length,
      activeUsers: liveUsers,
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders() }
  );
}
