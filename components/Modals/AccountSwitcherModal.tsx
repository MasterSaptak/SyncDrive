'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { SavedAccount, authService } from '@/services/auth';
import {
  Users,
  UserCheck,
  UserPlus,
  ArrowLeft,
  X,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAccountSwitched: (user: UserProfile) => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAccountSwitched,
}) => {
  const {
    savedAccounts,
    switchAccount,
    removeSavedAccount,
    login,
    loginWithGoogle,
    refreshSavedAccounts
  } = useAuth();
  const { showToast } = useNotification();

  const [mode, setMode] = useState<'list' | 'login'>('list');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Determine initial mode based on whether multiple accounts are saved
  useEffect(() => {
    if (isOpen) {
      refreshSavedAccounts();
      const accounts = authService.getSavedAccounts();
      // If multiple accounts are saved, show list first; otherwise show login
      if (accounts.length > 1) {
        setMode('list');
      } else {
        setMode('login');
      }
      setEmail('');
      setPassword('');
      setErrorMessage('');
    }
  }, [isOpen, refreshSavedAccounts]);

  if (!isOpen) return null;

  const currentEmail = currentUser?.email?.toLowerCase();

  const handleSelectAccount = async (account: SavedAccount) => {
    if (account.email.toLowerCase() === currentEmail) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const switchedUser = await switchAccount(account);
      const displayName = switchedUser.fullName || switchedUser.name || account.name || switchedUser.email;
      showToast(`Switched account to ${displayName}`, 'success');
      onAccountSwitched({
        id: switchedUser.id,
        tenantId: currentUser?.tenantId || `tenant_${switchedUser.id}`,
        email: switchedUser.email,
        fullName: displayName,
        role: 'customer',
        currentPlanId: switchedUser.currentPlanId || 'plan_100gb',
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch account');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter an email address');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      const loggedUser = await login(email, password || 'password123');
      const displayName = loggedUser.fullName || loggedUser.name || email.split('@')[0];
      showToast(`Signed in as ${displayName}`, 'success');
      onAccountSwitched({
        id: loggedUser.id,
        tenantId: currentUser?.tenantId || `tenant_${loggedUser.id}`,
        email: loggedUser.email,
        fullName: displayName,
        role: 'customer',
        currentPlanId: loggedUser.currentPlanId || 'plan_100gb',
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const user = await loginWithGoogle();
      showToast(`Signed in with Google as ${user.name || user.email}`, 'success');
      onAccountSwitched({
        id: user.id,
        tenantId: currentUser?.tenantId || `tenant_${user.id}`,
        email: user.email,
        fullName: user.name || user.email.split('@')[0],
        role: 'customer',
        currentPlanId: 'plan_100gb',
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };



  const handleRemove = (e: React.MouseEvent, targetEmail: string) => {
    e.stopPropagation();
    removeSavedAccount(targetEmail);
    showToast(`Removed ${targetEmail} from saved accounts`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-md overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            {mode === 'login' && savedAccounts.length > 1 ? (
              <button
                onClick={() => {
                  setMode('list');
                  setErrorMessage('');
                }}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                title="Back to Accounts"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {mode === 'list' ? 'Switch Account' : 'Sign In to Another Account'}
              </h3>
              <p className="text-[11px] text-neutral-500">
                {mode === 'list'
                  ? 'Select an account to switch to, or add a new one'
                  : 'Enter credentials or continue with Google'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === 'list' ? (
            /* Multi-Account Selection View */
            <div className="space-y-4">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {savedAccounts.map((account) => {
                  const isActive = account.email.toLowerCase() === currentEmail;
                  return (
                    <div
                      key={account.email}
                      onClick={() => !loading && handleSelectAccount(account)}
                      className={`group p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                            <span>{account.name}</span>
                            {isActive && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                            {account.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isActive ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleRemove(e, account.email)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                              title="Remove from this device"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                              Switch &rarr;
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Another Account Button */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-neutral-700 dark:text-neutral-300 hover:text-sky-600 dark:hover:text-sky-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Sign in with another account</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form View (for adding / switching to a new account) */
            <div className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.reynolds@example.com"
                      className="w-full py-2 pl-9 pr-3 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-2 pl-9 pr-3 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In & Switch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Or Google Sign In */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
                <span className="bg-white dark:bg-neutral-900 px-2.5 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                  Or
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
