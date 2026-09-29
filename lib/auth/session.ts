import { UserProfile } from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const map: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k && v.length) {
      try {
        map[k] = decodeURIComponent(v.join('='));
      } catch {
        map[k] = v.join('=');
      }
    }
  }
  return map;
}

export async function getAuthenticatedUser(request?: Request): Promise<UserProfile> {
  if (request) {
    const cookies = parseCookieHeader(request.headers.get('cookie'));
    const explicitUserId = request.headers.get('x-user-id') || cookies['syncdrive_user_id'];

    // 1. Check if user profile is already in memory
    if (explicitUserId && dataStore.profiles.has(explicitUserId)) {
      return dataStore.profiles.get(explicitUserId)!;
    }

    // 2. Check if user data was serialized in cookies
    if (cookies['syncdrive_user_data']) {
      try {
        const cachedUser = JSON.parse(cookies['syncdrive_user_data']);
        if (cachedUser && (cachedUser.id || cachedUser.email)) {
          const userId = cachedUser.id || explicitUserId || `usr_${Date.now()}`;
          const profile: UserProfile = {
            id: userId,
            tenantId: cachedUser.tenantId || `tenant_${userId}`,
            email: cachedUser.email || 'user@syncdrive.io',
            fullName: cachedUser.fullName || cachedUser.name || cachedUser.email?.split('@')[0] || 'SyncDrive User',
            role: cachedUser.role || 'customer',
            currentPlanId: cachedUser.currentPlanId || 'plan_100gb',
            avatarUrl: cachedUser.avatarUrl || cachedUser.avatar,
            createdAt: cachedUser.createdAt || cachedUser.joinedAt || new Date().toISOString(),
          };
          dataStore.profiles.set(userId, profile);
          return profile;
        }
      } catch {
        // ignore parse error
      }
    }

    // 3. Check Bearer Token with Supabase if configured
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (user && !error) {
            let profile = dataStore.profiles.get(user.id);
            if (!profile) {
              const tenantId = user.user_metadata?.tenant_id || `tenant_${user.id}`;
              profile = {
                id: user.id,
                tenantId,
                email: user.email || 'user@syncdrive.io',
                fullName: user.user_metadata?.full_name || 'SyncDrive User',
                role: (user.user_metadata?.role as any) || 'customer',
                currentPlanId: user.user_metadata?.plan_id || 'plan_100gb',
                createdAt: user.created_at || new Date().toISOString(),
              };
              dataStore.profiles.set(user.id, profile);
            }
            return profile;
          }
        } catch (err) {
          console.warn('Supabase token verification note:', err);
        }
      }
    }
  }

  // 4. Fallback if no explicit user header/cookie: use first registered customer or clean guest
  const registeredUsers = Array.from(dataStore.profiles.values()).filter(
    (p) => p.role === 'customer' && !p.email.includes('saasstorage.io') && !p.fullName.toLowerCase().includes('alex reynolds')
  );
  if (registeredUsers.length > 0) {
    return registeredUsers[registeredUsers.length - 1];
  }

  const fallback: UserProfile = {
    id: 'guest_user',
    tenantId: 'tenant_guest',
    email: 'user@syncdrive.io',
    fullName: 'SyncDrive User',
    role: 'customer',
    currentPlanId: 'plan_100gb',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SyncDrive',
    createdAt: new Date().toISOString(),
  };
  return fallback;
}
