import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { dataStore } from '@/lib/db/data-store';
import { UserProfile, BYTES_PER_GIB } from '@/types';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const origin = requestUrl.origin;

  if (error) {
    console.error('OAuth Callback Error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Supabase exchangeCodeForSession error:', exchangeError.message);
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
          );
        }

        if (data?.user) {
          const user = data.user;
          const cleanEmail = (user.email || '').trim().toLowerCase();
          const cleanName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            cleanEmail.split('@')[0] ||
            'SyncDrive User';
          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

          let profile: UserProfile | undefined = dataStore.profiles.get(user.id);
          if (!profile) {
            const existing = Array.from(dataStore.profiles.values()).find(
              (p) => p.email.toLowerCase() === cleanEmail
            );
            if (existing) {
              profile = existing;
              profile.id = user.id;
              profile.avatarUrl = avatarUrl;
              dataStore.profiles.set(user.id, profile);
            } else {
              const tenantId = user.user_metadata?.tenant_id || `tenant_${user.id}`;
              const createdProfile: UserProfile = {
                id: user.id,
                tenantId,
                email: cleanEmail,
                fullName: cleanName,
                role: 'customer',
                currentPlanId: 'plan_100gb',
                avatarUrl,
                createdAt: user.created_at || new Date().toISOString(),
              };
              dataStore.profiles.set(user.id, createdProfile);
              profile = createdProfile;
            }
          }

          const activeProfile: UserProfile = profile;
          dataStore.userStatuses.set(activeProfile.id, 'active');

          // Ensure subscription & quota allocation
          const subId = `sub_${activeProfile.id}`;
          if (!dataStore.subscriptions.has(subId)) {
            dataStore.subscriptions.set(subId, {
              id: subId,
              tenantId: activeProfile.tenantId,
              userId: activeProfile.id,
              planId: 'plan_100gb',
              status: 'active',
              storageEntitlementBytes: 100 * BYTES_PER_GIB,
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          const allocId = `alloc_${activeProfile.id}`;
          if (!dataStore.storageAllocations.has(allocId)) {
            dataStore.storageAllocations.set(allocId, {
              id: allocId,
              tenantId: activeProfile.tenantId,
              userId: activeProfile.id,
              allocatedBytes: 100 * BYTES_PER_GIB,
              allocationType: 'plan_quota',
              isActive: true,
              expiresAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          if (!dataStore.storageUsage.has(activeProfile.id)) {
            dataStore.storageUsage.set(activeProfile.id, {
              id: `usage_${activeProfile.id}`,
              tenantId: activeProfile.tenantId,
              userId: activeProfile.id,
              usedBytes: 0,
              reservedBytes: 0,
              fileCount: 0,
              folderCount: 0,
              lastCalculatedAt: new Date().toISOString(),
            });
          }

          // Audit log emission
          try {
            const { AuditService } = await import('@/lib/services/audit.service');
            await AuditService.log({
              tenantId: activeProfile.tenantId,
              userId: activeProfile.id,
              action: 'USER_LOGGED_IN',
              resourceType: 'auth',
              resourceId: activeProfile.id,
              metadata: { email: activeProfile.email, authProvider: 'google_oauth' },
            });
          } catch (e) {
            console.warn('Audit logging note:', e);
          }

          const response = NextResponse.redirect(`${origin}/dashboard`);
          response.cookies.set('syncdrive_user_id', activeProfile.id, {
            path: '/',
            maxAge: 30 * 24 * 3600,
            sameSite: 'lax',
          });
          response.cookies.set('syncdrive_user_data', JSON.stringify(activeProfile), {
            path: '/',
            maxAge: 30 * 24 * 3600,
            sameSite: 'lax',
          });

          return response;
        }
      } catch (err: any) {
        console.error('Error exchanging OAuth code:', err);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(err.message || 'OAuth exchange failed')}`
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
