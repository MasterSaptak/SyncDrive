import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { AuditService } from '@/lib/services/audit.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(
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

  // Simulate network round-trip ping to Google Drive API
  const latency = Math.floor(Math.random() * 25) + 22;
  drive.lastHealthCheck = new Date().toISOString();
  drive.healthStatus = 'healthy';
  drive.updatedAt = new Date().toISOString();

  await AuditService.log({
    tenantId: 'tenant_system_root',
    userId: auth.user?.id || 'admin',
    action: 'DRIVE_HEALTH_CHECK_TRIGGERED',
    resourceType: 'storage' as any,
    resourceId: driveId,
    metadata: { latencyMs: latency, status: 'healthy' },
  });

  const updatedNode = {
    id: drive.id,
    name: drive.name,
    email: drive.email,
    capacityBytes: drive.capacityTotalBytes,
    usedBytes: drive.capacityUsedBytes,
    availableBytes: drive.availableBytes,
    status: drive.status === 'active' ? 'online' : drive.status,
    healthStatus: 'healthy',
    healthLatencyMs: latency,
    lastHealthCheck: drive.lastHealthCheck,
  };

  return NextResponse.json({ success: true, drive: updatedNode }, { headers: corsHeaders() });
}
