import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { AuditService } from '@/lib/services/audit.service';
import { DeviceSessionService } from '@/lib/services/device-session.service';
import { BYTES_PER_GIB } from '@/types';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const searchParams = req.nextUrl.searchParams;
  const query = (searchParams.get('search') || searchParams.get('query') || '').toLowerCase().trim();
  const roleFilter = searchParams.get('role');
  const statusFilter = searchParams.get('status');

  const users: any[] = [];

  for (const profile of dataStore.profiles.values()) {
    const status = dataStore.userStatuses.get(profile.id) || 'active';
    const sub = Array.from(dataStore.subscriptions.values()).find((s) => s.userId === profile.id);
    const usage = dataStore.storageUsage.get(profile.id);
    const plan = dataStore.plans.find((p) => p.id === (sub?.planId || profile.currentPlanId)) || dataStore.plans[0];

    const allocatedBytes = sub?.storageEntitlementBytes || plan.quotaBytes;
    const usedBytes = usage?.usedBytes || 0;
    const filesCount = usage?.fileCount || 0;
    const usagePct = ((usedBytes / (allocatedBytes || 1)) * 100).toFixed(1);

    const liveSession = DeviceSessionService.getUserLiveSession(profile.id);
    const isOnline = !!liveSession;

    const userObj = {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName || 'SyncDrive User',
      displayName: profile.fullName?.split(' ')[0] || 'User',
      avatarUrl: profile.avatarUrl || `https://picsum.photos/seed/${profile.id}/300/300`,
      role: profile.role,
      status,
      isOnline,
      activeDevice: liveSession ? `${liveSession.browser} on ${liveSession.os}` : undefined,
      currentAction: liveSession?.activeAction || (isOnline ? 'Active' : 'Offline'),
      currentPath: liveSession?.currentPath,
      liveSession: liveSession || undefined,
      subscriptionStatus: sub?.status || 'active',
      planName: plan.name,
      subscriptionPlan: plan.name,
      subscribedAt: sub?.createdAt || profile.createdAt,
      subscriptionValidity: sub?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly',
      diskStatus: `${usagePct}% used`,
      storageAllocatedBytes: allocatedBytes,
      storageUsedBytes: usedBytes,
      filesCount,
      createdAt: profile.createdAt,
      lastActiveAt: liveSession?.lastSeenAt || new Date().toISOString(),
      country: 'United States',
      dateOfBirth: '1995-04-12',
      gender: 'Prefer not to say',
      phone: '+1 (555) 019-2834',
      paymentMethod: 'UPI / Card',
    };

    // Filter checks
    if (query) {
      const match =
        userObj.fullName.toLowerCase().includes(query) ||
        userObj.email.toLowerCase().includes(query) ||
        userObj.id.toLowerCase().includes(query);
      if (!match) continue;
    }

    if (roleFilter && roleFilter !== 'all' && userObj.role !== roleFilter) {
      continue;
    }

    if (statusFilter && statusFilter !== 'all' && userObj.status !== statusFilter) {
      continue;
    }

    users.push(userObj);
  }

  return NextResponse.json(users, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  try {
    const body = await req.json();
    const { email, fullName, role = 'customer', planId = 'plan_100gb' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400, headers: corsHeaders() });
    }

    const userId = `usr_${Date.now()}`;
    const tenantId = `tenant_${userId}`;
    const plan = dataStore.plans.find((p) => p.id === planId) || dataStore.plans[0];

    dataStore.profiles.set(userId, {
      id: userId,
      tenantId,
      email,
      fullName: fullName || email.split('@')[0],
      role,
      currentPlanId: plan.id,
      createdAt: new Date().toISOString(),
    });

    dataStore.userStatuses.set(userId, 'active');

    dataStore.subscriptions.set(`sub_${userId}`, {
      id: `sub_${userId}`,
      tenantId,
      userId,
      planId: plan.id,
      status: 'active',
      storageEntitlementBytes: plan.quotaBytes,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    dataStore.storageUsage.set(userId, {
      id: `usage_${userId}`,
      tenantId,
      userId,
      usedBytes: 0,
      reservedBytes: 0,
      fileCount: 0,
      folderCount: 0,
      lastCalculatedAt: new Date().toISOString(),
    });

    await AuditService.log({
      tenantId,
      userId: auth.user?.id || 'admin',
      action: 'ADMIN_USER_CREATED',
      resourceType: 'auth',
      resourceId: userId,
      metadata: { email, role, planId },
    });

    return NextResponse.json({ success: true, userId }, { status: 201, headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
