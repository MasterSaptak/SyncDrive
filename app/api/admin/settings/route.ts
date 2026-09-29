import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { AuditService } from '@/lib/services/audit.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  return NextResponse.json(dataStore.settings, { headers: corsHeaders() });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const body = await req.json();

    if (body.warningThreshold !== undefined) dataStore.settings.warningThreshold = Number(body.warningThreshold);
    if (body.criticalThreshold !== undefined) dataStore.settings.criticalThreshold = Number(body.criticalThreshold);
    if (body.maxUploadSizeGB !== undefined) dataStore.settings.maxUploadSizeGB = Number(body.maxUploadSizeGB);
    if (body.trashRetentionDays !== undefined) dataStore.settings.trashRetentionDays = Number(body.trashRetentionDays);
    if (body.maintenanceMode !== undefined) dataStore.settings.maintenanceMode = Boolean(body.maintenanceMode);
    if (body.strictSharding !== undefined) dataStore.settings.strictSharding = Boolean(body.strictSharding);
    if (body.defaultUpiId !== undefined) dataStore.settings.defaultUpiId = String(body.defaultUpiId);

    await AuditService.log({
      tenantId: 'tenant_system_root',
      userId: auth.user?.id || 'admin',
      action: 'UPDATE_SYSTEM_SETTINGS',
      resourceType: 'storage' as any,
      metadata: body,
    });

    return NextResponse.json({ success: true, settings: dataStore.settings }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
