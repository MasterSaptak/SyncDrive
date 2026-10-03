import { User, AuthSession } from "../types/user";
import { ApiError } from "../lib/api";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

const SESSION_KEY = "syncdrive_auth_session";
const SAVED_ACCOUNTS_KEY = "syncdrive_saved_accounts";

export interface SavedAccount {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  planName?: string;
  lastLoginAt: string;
}

function setAuthCookies(user: User) {
  if (typeof document === 'undefined') return;
  const maxAge = 30 * 24 * 3600;
  document.cookie = `syncdrive_user_id=${encodeURIComponent(user.id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `syncdrive_user_data=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'syncdrive_user_id=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'syncdrive_user_data=; path=/; max-age=0; SameSite=Lax';
}



export const authService = {
  getSavedAccounts(): SavedAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed: SavedAccount[] = JSON.parse(raw);
      return parsed.filter((a) => a && a.email);
    } catch {
      return [];
    }
  },

  saveAccount(user: User): SavedAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const accounts = this.getSavedAccounts();
      const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === user.email.toLowerCase());
      const displayName = user.fullName || user.name || user.email.split('@')[0];
      const item: SavedAccount = {
        id: user.id,
        email: user.email,
        name: displayName,
        avatar: user.avatar || user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        planName: user.currentPlanId === 'plan_1tb' ? '1 TB Ultimate' : '100 GB Starter',
        lastLoginAt: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...item };
      } else {
        accounts.push(item);
      }
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
      return accounts;
    } catch {
      return [];
    }
  },

  removeSavedAccount(email: string): SavedAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const accounts = this.getSavedAccounts().filter((a) => a.email.toLowerCase() !== email.toLowerCase());
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
      return accounts;
    } catch {
      return [];
    }
  },

  async getCurrentSession(): Promise<AuthSession | null> {
    if (typeof window === "undefined") return null;
    let stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)syncdrive_user_data=([^;]+)/);
        if (match) {
          try {
            const parsedUser = JSON.parse(decodeURIComponent(match[1]));
            if (parsedUser && (parsedUser.id || parsedUser.email)) {
              const session: AuthSession = {
                user: parsedUser,
                token: `jwt_oauth_${Date.now()}`,
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              };
              localStorage.setItem(SESSION_KEY, JSON.stringify(session));
              this.saveAccount(parsedUser);
              return session;
            }
          } catch {}
        }
      }
      return null;
    }
    try {
      const session = JSON.parse(stored) as AuthSession;
      if (session && session.user) {
        if (!session.user.fullName && session.user.name) {
          session.user.fullName = session.user.name;
        }
        if (!session.user.name && session.user.fullName) {
          session.user.name = session.user.fullName;
        }
        setAuthCookies(session.user);
        this.saveAccount(session.user);
      }
      return session;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string, rememberMe = true): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();

    // Call backend API login
    let userFromApi: any = null;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid email or password');
    }
    userFromApi = data.user;

    const saved = this.getSavedAccounts().find((a) => a.email.toLowerCase() === cleanEmail);
    const resolvedName = userFromApi?.fullName || saved?.name || cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9 ]/g, ' ').trim();

    const user: User = {
      id: userFromApi?.id || saved?.id || `usr_${Date.now()}`,
      name: resolvedName,
      fullName: resolvedName,
      email: cleanEmail,
      role: (userFromApi?.role as any) || "customer",
      status: "trial",
      joinedAt: userFromApi?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      avatar: userFromApi?.avatarUrl || saved?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(resolvedName)}`,
      avatarUrl: userFromApi?.avatarUrl || saved?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(resolvedName)}`,
      currentPlanId: userFromApi?.currentPlanId || 'plan_100gb',
    };

    const session: AuthSession = {
      user,
      token: `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      expiresAt: new Date(Date.now() + (rememberMe ? 30 * 86400000 : 86400000)).toISOString()
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setAuthCookies(user);
      this.saveAccount(user);
    }
    return session;
  },

  async sendVerificationOTP(name: string, email: string, password: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: name }
        }
      });
      if (error) throw new Error(error.message);
    } else {
      // Mock mode: just return success to simulate OTP sent
      console.log("Mock OTP sent to", cleanEmail);
    }
  },

  async verifyOTPAndRegister(name: string, email: string, password: string, token: string): Promise<{ session: AuthSession; isNewTrial: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'signup'
      });
      if (error) throw new Error(error.message);
    } else {
      // Mock mode: simulate OTP verification
      if (token !== "123456" && token !== "000000") {
        throw new Error("Invalid verification code");
      }
    }
    
    // Now call backend to provision the account
    return this.register(name, email, password);
  },

  async register(name: string, email: string, password: string): Promise<{ session: AuthSession; isNewTrial: boolean }> {
    const cleanName = name.trim() || 'SyncDrive User';
    const cleanEmail = email.trim().toLowerCase();

    // Call backend API register
    let userFromApi: any = null;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: cleanName, email: cleanEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register account');
    }
    userFromApi = data.user;

    const newUser: User = {
      id: userFromApi?.id || `usr_${Date.now()}`,
      name: cleanName,
      fullName: cleanName,
      email: cleanEmail,
      role: "customer",
      status: "trial",
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      currentPlanId: 'plan_100gb',
    };

    const session: AuthSession = {
      user: newUser,
      token: `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setAuthCookies(newUser);
      this.saveAccount(newUser);
    }
    return { session, isNewTrial: true };
  },

  async loginWithGoogle(): Promise<AuthSession> {
    if (typeof window === "undefined") {
      throw new Error("Google Sign-In requires a browser environment.");
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Supabase is not configured. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('not enabled') || error.message?.toLowerCase().includes('unsupported provider')) {
        throw new Error('Google Sign-In is not activated yet in your Supabase project. Please enable Google in Supabase Dashboard -> Authentication -> Providers -> Google.');
      }
      throw new Error(error.message);
    }

    if (data?.url) {
      // Redirect browser directly to accounts.google.com
      window.location.href = data.url;
      return new Promise(() => {});
    }

    throw new Error("Failed to receive Google authorization URL from Supabase.");
  },

  async switchAccount(account: SavedAccount): Promise<AuthSession> {
    // Notify backend login so session cookie is updated
    let userFromApi: any = null;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, userId: account.id, fullName: account.name }),
      });
      if (res.ok) {
        const data = await res.json();
        userFromApi = data.user;
      }
    } catch (e) {
      console.warn('Backend switchAccount sync note:', e);
    }

    const user: User = {
      id: userFromApi?.id || account.id,
      name: account.name,
      fullName: account.name,
      email: account.email,
      role: "customer",
      status: "trial",
      joinedAt: userFromApi?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      avatar: account.avatar || userFromApi?.avatarUrl,
      avatarUrl: account.avatar || userFromApi?.avatarUrl,
      currentPlanId: userFromApi?.currentPlanId || 'plan_100gb',
    };

    const session: AuthSession = {
      user,
      token: `jwt_switch_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setAuthCookies(user);
      this.saveAccount(user);
    }
    return session;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
      clearAuthCookies();
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      throw new Error("Please enter a valid email address");
    }
    
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      if (error) {
        console.warn("Forgot password error:", error.message);
      }
    }
    
    return {
      success: true,
      // Generic message to prevent email enumeration
      message: `If an account exists for ${cleanEmail}, you will receive password reset instructions shortly.`
    };
  },

  async resetPassword(_token: string, newPass: string): Promise<{ success: boolean }> {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPass
      });
      if (error) {
        throw new Error(error.message);
      }
    }
    
    // Sign out to require a fresh login with the new password
    if (typeof window !== "undefined") {
      try {
        await this.logout();
      } catch {}
    }
    
    return { success: true };
  }
};
