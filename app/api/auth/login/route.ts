import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { dataStore } from '@/lib/db/data-store';
import { UserProfile } from '@/types';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password, userId: reqUserId, fullName: reqFullName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let profile: (UserProfile & { name?: string }) | null = null;
    let authValidated = false;

    // 1. If password is provided, verify against Supabase and local credentials
    if (password) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (data?.user && !error) {
            authValidated = true;
            profile = dataStore.profiles.get(data.user.id) || null;
            if (!profile) {
              const existing = Array.from(dataStore.profiles.values()).find(
                (p) => p.email.toLowerCase() === cleanEmail
              );
              if (existing) {
                profile = existing;
                profile.id = data.user.id;
                dataStore.profiles.set(data.user.id, profile);
              } else {
                const tenantId = data.user.user_metadata?.tenant_id || `tenant_${data.user.id}`;
                const name = data.user.user_metadata?.full_name || reqFullName || cleanEmail.split('@')[0];
                profile = {
                  id: data.user.id,
                  tenantId,
                  email: data.user.email || cleanEmail,
                  fullName: name,
                  name,
                  role: (data.user.user_metadata?.role as any) || 'customer',
                  currentPlanId: 'plan_100gb',
                  avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
                  createdAt: data.user.created_at || new Date().toISOString(),
                };
                dataStore.profiles.set(profile.id, profile);
              }
            }
          }
        } catch (err: any) {
          console.warn('Supabase signin attempt:', err?.message);
        }
      }

      if (!authValidated) {
        return NextResponse.json(
          { error: 'Invalid email or password. Please check your credentials.' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Password is required to sign in.' },
        { status: 400 }
      );
    }


    if (!profile) {
      return NextResponse.json(
        { error: 'No account found with this email. Please register first.' },
        { status: 404 }
      );
    }

    dataStore.userStatuses.set(profile.id, 'active');

    // Ensure subscription & allocation records exist
    const subId = `sub_${profile.id}`;
    if (!dataStore.subscriptions.has(subId)) {
      const BYTES_PER_GIB = 1024 * 1024 * 1024;
      dataStore.subscriptions.set(subId, {
        id: subId,
        tenantId: profile.tenantId,
        userId: profile.id,
        planId: profile.currentPlanId || 'plan_100gb',
        status: 'active',
        storageEntitlementBytes: 100 * BYTES_PER_GIB,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const allocId = `alloc_${profile.id}`;
    if (!dataStore.storageAllocations.has(allocId)) {
      const BYTES_PER_GIB = 1024 * 1024 * 1024;
      dataStore.storageAllocations.set(allocId, {
        id: allocId,
        tenantId: profile.tenantId,
        userId: profile.id,
        allocatedBytes: 100 * BYTES_PER_GIB,
        allocationType: 'plan_quota',
        isActive: true,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!dataStore.storageUsage.has(profile.id)) {
      dataStore.storageUsage.set(profile.id, {
        id: `usage_${profile.id}`,
        tenantId: profile.tenantId,
        userId: profile.id,
        usedBytes: 0,
        reservedBytes: 0,
        fileCount: 0,
        folderCount: 0,
        lastCalculatedAt: new Date().toISOString(),
      });
    }

    // Audit log
    const { AuditService } = await import('@/lib/services/audit.service');
    await AuditService.log({
      tenantId: profile.tenantId,
      userId: profile.id,
      action: 'USER_LOGGED_IN',
      resourceType: 'auth',
      resourceId: profile.id,
      metadata: { email: profile.email },
    });

    const response = NextResponse.json({
      success: true,
      user: profile,
    });

    response.cookies.set('syncdrive_user_id', profile.id, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
    });
    response.cookies.set('syncdrive_user_data', JSON.stringify(profile), {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
