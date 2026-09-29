import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const logs = dataStore.auditLogs.map((log) => {
    const user = dataStore.profiles.get(log.userId);
    return {
      id: log.id,
      timestamp: log.timestamp,
      actorEmail: user?.email || (log.userId === 'admin' ? 'admin@syncdrive.internal' : log.userId),
      actorRole: user?.role || (log.userId === 'admin' ? 'admin' : 'customer'),
      action: log.action.toLowerCase(),
      resource: log.resourceType,
      resourceId: log.resourceId || 'sys',
      status: 'success',
      ipAddress: log.ipAddress || '198.51.100.24',
      metadata: log.metadata || {},
    };
  });

  // Sort newest first
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(logs, { headers: corsHeaders() });
}
