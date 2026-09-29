'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { LogIn, UserPlus, KeyRound, Shield, CheckCircle2, AlertCircle, X, Loader2, User } from 'lucide-react';
import { authService } from '@/services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChanged: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register' | 'reset' | 'account';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        if (data.user) {
          authService.saveAccount(data.user);
          localStorage.setItem('syncdrive_auth_session', JSON.stringify({
            user: data.user,
            token: `jwt_${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          }));
        }
        onUserChanged(data.user);
        setMessage({ type: 'success', text: 'Successfully logged in.' });
        setTimeout(() => onClose(), 800);
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        if (data.user) {
          authService.saveAccount(data.user);
          localStorage.setItem('syncdrive_auth_session', JSON.stringify({
            user: data.user,
            token: `jwt_${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          }));
        }
        onUserChanged(data.user);
        setMessage({ type: 'success', text: 'Account created and logged in.' });
        setTimeout(() => onClose(), 800);
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password reset failed');
        setMessage({ type: 'success', text: data.message || 'Password reset dispatched.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication error' });
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('syncdrive_auth_session');
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setLoading(false);
      window.location.href = '/';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900">
                {mode === 'login' && 'Sign In to SyncDrive'}
                {mode === 'register' && 'Create Customer Account'}
                {mode === 'reset' && 'Reset Password'}
                {mode === 'account' && 'Customer Account Details'}
              </div>
              <div className="text-[11px] text-neutral-500">Secure Customer Authentication</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-100 bg-neutral-50 text-xs font-medium text-neutral-600">
          <button
            onClick={() => { setMode('login'); setMessage(null); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-neutral-900 text-neutral-900 font-semibold bg-white'
                : 'border-transparent hover:text-neutral-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setMessage(null); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-neutral-900 text-neutral-900 font-semibold bg-white'
                : 'border-transparent hover:text-neutral-900'
            }`}
          >
            Register
          </button>
          {currentUser && (
            <button
              onClick={() => { setMode('account'); setMessage(null); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                mode === 'account'
                  ? 'border-neutral-900 text-neutral-900 font-semibold bg-white'
                  : 'border-transparent hover:text-neutral-900'
              }`}
            >
              Account
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {message && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {mode === 'account' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Full Name:</span>
                  <span className="font-semibold text-neutral-900">{currentUser?.fullName || 'Customer'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Email:</span>
                  <span className="font-semibold text-neutral-900">{currentUser?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Account Type:</span>
                  <span className="font-semibold text-sky-600">Customer Storage</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full mt-2 py-2 px-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Reynolds"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-700">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('reset'); setMessage(null); }}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn className="w-3.5 h-3.5" />
                ) : mode === 'register' ? (
                  <UserPlus className="w-3.5 h-3.5" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                </span>
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setMessage(null); }}
                  className="w-full py-2 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Back to Sign In
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
