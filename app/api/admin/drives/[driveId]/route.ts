import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { AuditService } from '@/lib/services/audit.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ driveId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { driveId } = await params;
  const drive = dataStore.storageAccounts.get(driveId);

  if (!drive) {
    return NextResponse.json({ error: 'Storage node not found' }, { status: 404, headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const newStatus = body.status === 'online' ? 'active' : body.status;
    drive.status = newStatus;
    drive.updatedAt = new Date().toISOString();

    await AuditService.log({
      tenantId: 'tenant_system_root',
      userId: auth.user?.id || 'admin',
      action: `DRIVE_STATUS_${body.status.toUpperCase()}`,
      resourceType: 'storage' as any,
      resourceId: driveId,
      metadata: { status: body.status },
    });

    return NextResponse.json({ success: true, drive }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
