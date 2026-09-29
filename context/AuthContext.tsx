'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole } from "../types/user";
import { authService, SavedAccount } from "../services/auth";
import { deviceSocket } from "../lib/auth/device-socket";
import { DeviceLimitModal } from "../components/Modals/DeviceLimitModal";
import { DeviceSessionState } from "../types/session";

interface AuthGateState {
  isOpen: boolean;
  returnUrl?: string;
  planId?: string;
  message?: string;
  title?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedAccounts: SavedAccount[];
  login: (email: string, pass: string, remember?: boolean) => Promise<User>;
  register: (name: string, email: string, pass: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  switchAccount: (account: SavedAccount) => Promise<User>;
  removeSavedAccount: (email: string) => void;
  refreshSavedAccounts: () => void;
  logout: () => Promise<void>;
  updateCurrentUser: (data: Partial<User>) => void;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  authGate: AuthGateState;
  openAuthGate: (options?: { returnUrl?: string; planId?: string; message?: string; title?: string }) => void;
  closeAuthGate: () => void;
  showTrialWelcome: boolean;
  setShowTrialWelcome: (show: boolean) => void;
  closeTrialWelcome: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrialWelcome, setShowTrialWelcome] = useState(false);
  const [authGate, setAuthGate] = useState<AuthGateState>({ isOpen: false });
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [deviceSessionState, setDeviceSessionState] = useState<DeviceSessionState>(() =>
    deviceSocket.getState()
  );

  useEffect(() => {
    const unsub = deviceSocket.subscribe((newState) => {
      setDeviceSessionState(newState);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user?.id) {
      deviceSocket.startSessionMonitoring(user.id);
    } else {
      deviceSocket.startGuestMonitoring();
    }
  }, [user?.id]);

  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(authService.getSavedAccounts());
  }, []);

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await authService.getCurrentSession();
        if (session) {
          setUser(session.user);
          authService.saveAccount(session.user);
        }
        refreshSavedAccounts();
      } catch (err) {
        console.error("Failed to restore session", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, [refreshSavedAccounts]);

  const login = async (email: string, pass: string, remember = true): Promise<User> => {
    setIsLoading(true);
    try {
      const session = await authService.login(email, pass, remember);
      setUser(session.user);
      refreshSavedAccounts();
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { session, isNewTrial } = await authService.register(name, email, pass);
      setUser(session.user);
      refreshSavedAccounts();
      if (isNewTrial) {
        setShowTrialWelcome(true);
      }
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    setIsLoading(true);
    try {
      const session = await authService.loginWithGoogle();
      setUser(session.user);
      refreshSavedAccounts();
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (account: SavedAccount): Promise<User> => {
    setIsLoading(true);
    try {
      const session = await authService.switchAccount(account);
      setUser(session.user);
      refreshSavedAccounts();
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const removeSavedAccount = (email: string) => {
    const updated = authService.removeSavedAccount(email);
    setSavedAccounts(updated);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await deviceSocket.disconnect();
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentUser = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    authService.saveAccount(updated);
    refreshSavedAccounts();
  };

  const openAuthGate = (options?: { returnUrl?: string; planId?: string; message?: string; title?: string }) => {
    setAuthGate({
      isOpen: true,
      returnUrl: options?.returnUrl,
      planId: options?.planId,
      message: options?.message,
      title: options?.title
    });
  };

  const closeAuthGate = () => {
    setAuthGate({ isOpen: false });
  };

  const closeTrialWelcome = () => {
    setShowTrialWelcome(false);
  };

  const refreshUser = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (session && session.user) {
        setUser(session.user);
        refreshSavedAccounts();
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        savedAccounts,
        login,
        register,
        loginWithGoogle,
        switchAccount,
        removeSavedAccount,
        refreshSavedAccounts,
        logout,
        updateCurrentUser,
        updateUser: updateCurrentUser,
        refreshUser,
        authGate,
        openAuthGate,
        closeAuthGate,
        showTrialWelcome,
        setShowTrialWelcome,
        closeTrialWelcome
      }}
    >
      {children}
      {user && (
        <DeviceLimitModal
          state={deviceSessionState}
          onUseHere={async (evictId) => {
            return await deviceSocket.useHere(evictId);
          }}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
