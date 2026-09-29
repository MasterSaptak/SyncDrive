import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { dataStore } from '@/lib/db/data-store';
import { UserProfile, BYTES_PER_GIB } from '@/types';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (fullName || email.split('@')[0]).replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'SyncDrive User';

    // 1. Check if email already registered in local store
    const existingLocal = Array.from(dataStore.profiles.values()).find(
      (p) => p.email.toLowerCase() === cleanEmail
    );
    if (existingLocal) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    let userId = `user_${crypto.randomUUID()}`;
    let tenantId = `tenant_${crypto.randomUUID()}`;

    // 2. Register in Supabase Auth via Admin Client (with email_confirm: true so user can login immediately)
    const supabaseAdmin = getSupabaseAdminClient();
    const supabaseServer = getSupabaseServerClient();

    if (supabaseAdmin && password) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            role: 'customer',
            tenant_id: tenantId,
          },
        });

        if (data?.user) {
          userId = data.user.id;
        } else if (error) {
          if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('exists')) {
            return NextResponse.json(
              { error: 'An account with this email already exists in Supabase.' },
              { status: 409 }
            );
          }
          console.warn('Supabase admin createUser note:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase admin signup exception:', err?.message);
      }
    } else if (supabaseServer && password) {
      try {
        const { data, error } = await supabaseServer.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              role: 'customer',
              tenant_id: tenantId,
            },
          },
        });
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (err: any) {
        console.warn('Supabase server signup exception:', err?.message);
      }
    }



    // Provision local multi-tenant profile & default subscription
    const newProfile: UserProfile & { name: string } = {
      id: userId,
      tenantId,
      email: cleanEmail,
      fullName: cleanName,
      name: cleanName,
      role: 'customer',
      currentPlanId: 'plan_100gb',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      createdAt: new Date().toISOString(),
    };
    dataStore.profiles.set(userId, newProfile);
    dataStore.userStatuses.set(userId, 'active');

    // Provision initial subscription entitlement
    const subId = `sub_${userId}`;
    dataStore.subscriptions.set(subId, {
      id: subId,
      tenantId,
      userId,
      planId: 'plan_100gb',
      status: 'active',
      storageEntitlementBytes: 100 * BYTES_PER_GIB,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Provision initial cluster storage allocation for pool accounting
    const allocId = `alloc_${userId}`;
    dataStore.storageAllocations.set(allocId, {
      id: allocId,
      tenantId,
      userId,
      allocatedBytes: 100 * BYTES_PER_GIB,
      allocationType: 'plan_quota',
      isActive: true,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Provision initial storage usage accounting
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

    // Real-time audit log emission
    const { AuditService } = await import('@/lib/services/audit.service');
    await AuditService.log({
      tenantId,
      userId,
      action: 'USER_REGISTERED',
      resourceType: 'auth',
      resourceId: userId,
      metadata: {
        email: cleanEmail,
        fullName: cleanName,
        planId: 'plan_100gb',
        allocatedGB: 100,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: newProfile,
      message: 'Account registered successfully.',
    });

    response.cookies.set('syncdrive_user_id', userId, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
    });
    response.cookies.set('syncdrive_user_data', JSON.stringify(newProfile), {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
