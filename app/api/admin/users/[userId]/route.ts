import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { QuotaService } from '@/lib/services/quota.service';
import { AuditService } from '@/lib/services/audit.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { userId } = await params;
  const profile = dataStore.profiles.get(userId);

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders() });
  }

  const status = dataStore.userStatuses.get(userId) || 'active';
  const sub = Array.from(dataStore.subscriptions.values()).find((s) => s.userId === userId);
  const usage = dataStore.storageUsage.get(userId);
  const plan = dataStore.plans.find((p) => p.id === (sub?.planId || profile.currentPlanId)) || dataStore.plans[0];

  const allocatedBytes = sub?.storageEntitlementBytes || plan.quotaBytes;
  const usedBytes = usage?.usedBytes || 0;
  const usagePct = ((usedBytes / (allocatedBytes || 1)) * 100).toFixed(1);

  const adminUser = {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName || 'SyncDrive User',
    displayName: profile.fullName?.split(' ')[0] || 'User',
    avatarUrl: profile.avatarUrl || `https://picsum.photos/seed/${profile.id}/300/300`,
    role: profile.role,
    status,
    subscriptionStatus: sub?.status || 'active',
    planName: plan.name,
    subscriptionPlan: plan.name,
    subscribedAt: sub?.createdAt || profile.createdAt,
    subscriptionValidity: sub?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
    billingCycle: 'monthly',
    diskStatus: `${usagePct}% used`,
    storageAllocatedBytes: allocatedBytes,
    storageUsedBytes: usedBytes,
    filesCount: usage?.fileCount || 0,
    createdAt: profile.createdAt,
    lastActiveAt: new Date().toISOString(),
    country: 'United States',
    dateOfBirth: '1995-04-12',
    gender: 'Prefer not to say',
    phone: '+1 (555) 019-2834',
    paymentMethod: 'UPI / Card',
  };

  const userProfile = {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    displayName: profile.fullName?.split(' ')[0] || 'User',
    dateOfBirth: '1995-04-12',
    gender: 'Prefer not to say',
    phone: '+1 (555) 019-2834',
    country: 'United States',
    accountStatus: status,
    currentPlan: plan.name,
    createdAt: profile.createdAt,
    updatedAt: new Date().toISOString(),
    bio: 'SyncDrive customer account managed under operations console.',
  };

  const subscription = {
    id: sub?.id || `sub_${userId}`,
    userId: profile.id,
    planId: plan.id,
    plan: {
      id: plan.id,
      name: plan.name,
      storageGB: Math.round(plan.quotaBytes / (1024 * 1024 * 1024)),
      monthlyPriceUSD: Math.round(plan.monthlyPrice / 25),
      features: plan.features,
    },
    status: sub?.status || 'active',
    billingPeriod: 'monthly',
    currentPeriodStart: sub?.currentPeriodStart || profile.createdAt,
    currentPeriodEnd: sub?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
  };

  const userFiles = Array.from(dataStore.files.values())
    .filter((f) => f.userId === userId && !f.isTrash)
    .map((f) => ({
      id: f.id,
      name: f.name,
      size: f.sizeBytes,
      mimeType: f.mimeType,
      category: f.mimeType.startsWith('image/') ? 'image' : f.mimeType === 'application/pdf' ? 'pdf' : 'document',
      folderId: f.parentId,
      userId: f.userId,
      isStarred: Boolean(f.isStarred),
      isTrash: false,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

  return NextResponse.json(
    {
      user: adminUser,
      profile: userProfile,
      subscription,
      files: userFiles,
    },
    { headers: corsHeaders() }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { userId } = await params;
  const profile = dataStore.profiles.get(userId);

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders() });
  }

  try {
    const body = await req.json();

    // 1. Update Account Status (active / suspended)
    if (body.status) {
      dataStore.userStatuses.set(userId, body.status);
      await AuditService.log({
        tenantId: profile.tenantId || 'tenant_default',
        userId: auth.user?.id || 'admin',
        action: `USER_STATUS_${body.status.toUpperCase()}`,
        resourceType: 'auth',
        resourceId: userId,
        metadata: { status: body.status },
      });
    }

    // 2. Update Role (customer / admin / super_admin)
    if (body.role) {
      profile.role = body.role;
      await AuditService.log({
        tenantId: profile.tenantId || 'tenant_default',
        userId: auth.user?.id || 'admin',
        action: `USER_ROLE_CHANGED`,
        resourceType: 'auth',
        resourceId: userId,
        metadata: { newRole: body.role },
      });
    }

    // 3. Update Subscription Status (active / paused / cancelled)
    if (body.subscriptionStatus) {
      const sub = Array.from(dataStore.subscriptions.values()).find((s) => s.userId === userId);
      if (sub) {
        sub.status = body.subscriptionStatus;
        sub.updatedAt = new Date().toISOString();
      }
      await AuditService.log({
        tenantId: profile.tenantId || 'tenant_default',
        userId: auth.user?.id || 'admin',
        action: `SUBSCRIPTION_STATUS_${body.subscriptionStatus.toUpperCase()}`,
        resourceType: 'subscription',
        resourceId: userId,
        metadata: { subscriptionStatus: body.subscriptionStatus },
      });
    }

    // 4. Update Plan / Quota
    if (body.planId) {
      await QuotaService.upgradePlan(userId, body.planId);
      await AuditService.log({
        tenantId: profile.tenantId || 'tenant_default',
        userId: auth.user?.id || 'admin',
        action: `ADMIN_PLAN_UPGRADED`,
        resourceType: 'quota',
        resourceId: userId,
        metadata: { planId: body.planId },
      });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { userId } = await params;
  dataStore.profiles.delete(userId);
  dataStore.userStatuses.delete(userId);
  dataStore.storageUsage.delete(userId);

  return NextResponse.json({ success: true, message: 'User deleted' }, { headers: corsHeaders() });
}
