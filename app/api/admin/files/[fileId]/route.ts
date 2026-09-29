import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { QuotaService } from '@/lib/services/quota.service';
import { AuditService } from '@/lib/services/audit.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { fileId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const permanent = searchParams.get('permanent') === 'true';

  const file = dataStore.files.get(fileId);
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404, headers: corsHeaders() });
  }

  if (permanent || file.isTrash) {
    // Permanently remove
    dataStore.files.delete(fileId);
    await QuotaService.freeUsedBytes(file.userId, file.sizeBytes);
    await AuditService.log({
      tenantId: file.tenantId || 'tenant_default',
      userId: auth.user?.id || 'admin',
      action: 'ADMIN_FILE_PURGED',
      resourceType: 'file',
      resourceId: fileId,
      metadata: { name: file.name, size: file.sizeBytes },
    });
  } else {
    // Move to trash
    file.isTrash = true;
    file.deletedAt = new Date().toISOString();
    file.updatedAt = new Date().toISOString();
    await AuditService.log({
      tenantId: file.tenantId || 'tenant_default',
      userId: auth.user?.id || 'admin',
      action: 'ADMIN_FILE_TRASHED',
      resourceType: 'file',
      resourceId: fileId,
      metadata: { name: file.name },
    });
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders() });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { fileId } = await params;
  const file = dataStore.files.get(fileId);
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404, headers: corsHeaders() });
  }

  try {
    const body = await req.json();

    if (body.action === 'restore') {
      file.isTrash = false;
      file.deletedAt = null;
      file.updatedAt = new Date().toISOString();
    }

    if (body.action === 'toggle_star') {
      file.isStarred = !file.isStarred;
      file.updatedAt = new Date().toISOString();
    }

    if (body.name) {
      file.name = body.name;
      file.updatedAt = new Date().toISOString();
    }

    return NextResponse.json({ success: true, file }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
