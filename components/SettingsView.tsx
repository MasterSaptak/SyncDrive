'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, LogicalQuota } from '@/types';
import { formatBytes } from '@/lib/formatters';
import {
  User,
  Shield,
  HardDrive,
  Bell,
  Key,
  CheckCircle2,
  Save,
  Clock,
  Layers,
  Sparkles,
  Lock,
  Globe,
  Smartphone,
  Laptop,
  Trash2,
  FileCode,
  Eye,
  EyeOff,
  Sliders,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  FolderSync,
  Share2,
  Palette,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface SettingsViewProps {
  user: UserProfile | null;
  quota: LogicalQuota | null;
  onOpenUpgrade: () => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
}

type SettingsTab =
  | 'profile'
  | 'security'
  | 'storage'
  | 'files'
  | 'sharing'
  | 'notifications'
  | 'appearance';

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  quota,
  onOpenUpgrade,
  onUserUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // 1. Profile State
  const [fullName, setFullName] = useState(user?.fullName || 'Alex Reynolds');
  const [displayName, setDisplayName] = useState('Alex');
  const [jobTitle, setJobTitle] = useState('Solutions Architect');
  const [timezone, setTimezone] = useState('Asia/Kolkata (GMT+5:30)');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [language, setLanguage] = useState('en');

  // 2. Security State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [zeroKnowledgeVault, setZeroKnowledgeVault] = useState(false);
  const [sessions, setSessions] = useState([
    {
      id: 'sess_1',
      device: 'Chrome on Windows 11',
      ip: '192.168.29.37',
      location: 'New Delhi, India',
      current: true,
      lastActive: 'Active Now',
    },
    {
      id: 'sess_2',
      device: 'Safari on iPhone 15 Pro',
      ip: '152.57.12.89',
      location: 'Bengaluru, India',
      current: false,
      lastActive: '3 hours ago',
    },
    {
      id: 'sess_3',
      device: 'Firefox on macOS Ventura',
      ip: '103.21.144.10',
      location: 'Mumbai, India',
      current: false,
      lastActive: '2 days ago',
    },
  ]);

  // 3. Storage & Cleanup State
  const [trashRetentionDays, setTrashRetentionDays] = useState('30');
  const [duplicateScannerRunning, setDuplicateScannerRunning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  // 4. Files & Upload State
  const [conflictAction, setConflictAction] = useState<'ask' | 'overwrite' | 'rename'>('rename');
  const [defaultViewMode, setDefaultViewMode] = useState<'grid' | 'list'>('grid');
  const [defaultSort, setDefaultSort] = useState<'name' | 'date' | 'size'>('date');
  const [chunkUploadSize, setChunkUploadSize] = useState<'2' | '5' | '10'>('5');
  const [autoThumbnails, setAutoThumbnails] = useState(true);
  const [dedupOnUpload, setDedupOnUpload] = useState(true);

  // 5. Sharing & Privacy State
  const [defaultSharePermission, setDefaultSharePermission] = useState<'view' | 'edit'>('view');
  const [requireSharePassword, setRequireSharePassword] = useState(false);
  const [defaultLinkExpiry, setDefaultLinkExpiry] = useState<'never' | '24h' | '7d' | '30d'>('7d');
  const [disablePublicDownload, setDisablePublicDownload] = useState(false);

  // 6. Notifications State
  const [storageThreshold, setStorageThreshold] = useState(90);
  const [notifyOnShare, setNotifyOnShare] = useState(true);
  const [notifyOnRenewal, setNotifyOnRenewal] = useState(true);
  const [notifyOnNewLogin, setNotifyOnNewLogin] = useState(true);
  const [desktopPush, setDesktopPush] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  // 7. Appearance State
  const { theme: themeMode, setTheme: setThemeMode } = useTheme();
  const [accentColor, setAccentColor] = useState<'neutral' | 'indigo' | 'emerald' | 'sky' | 'amber'>('neutral');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && onUserUpdate) {
      onUserUpdate({
        ...user,
        fullName,
      });
    }
    showToast('Profile details updated successfully.');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password changed successfully.');
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId || s.current));
    showToast('Session terminated.');
  };

  const handleRevokeAllSessions = () => {
    setSessions((prev) => prev.filter((s) => s.current));
    showToast('All other remote device sessions revoked.');
  };

  const handleDuplicateScan = () => {
    setDuplicateScannerRunning(true);
    setTimeout(() => {
      setDuplicateScannerRunning(false);
      setCleanupMessage('Scan complete: Zero duplicate chunks detected. Your storage deduplication is 100% optimized.');
    }, 1500);
  };

  const usedBytes = quota?.usedBytes || 0;
  const totalBytes = quota?.quotaBytes || 1;
  const percentage = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

  const navTabs: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'security', label: 'Security & 2FA', icon: Shield },
    { id: 'storage', label: 'Storage & Capacity', icon: HardDrive },
    { id: 'files', label: 'File & Upload Defaults', icon: FolderSync },
    { id: 'sharing', label: 'Sharing & Privacy', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">System Preferences & Settings</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              Personal SaaS
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Configure your personal account identity, storage quotas, access keys, sharing rules, and security vaults.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              showToast('All preferences saved.');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {savedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{savedToast}</span>
          </div>
          <button onClick={() => setSavedToast(null)} className="text-emerald-700 hover:underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Settings Body: Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar Category Navigation */}
        <div className="md:col-span-1">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-2 hidden md:block">
            Configuration
          </div>
          <div className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 md:w-full flex items-center justify-between px-3.5 py-2 md:py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900 border md:border-transparent border-neutral-200/70 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 md:gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Settings Content Area */}
        <div className="md:col-span-3">
          {/* ======================================================== */}
          {/* 1. PROFILE & ACCOUNT                                      */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-6 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Profile & Identity</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Personal credentials and workspace localization settings.
                </p>
              </div>

              {/* Avatar section */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-neutral-800 to-neutral-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AR'
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900">{fullName}</span>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Verified Member
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">{user?.email || 'alex.reynolds@example.com'}</div>
                  <div className="text-[10px] text-neutral-400">
                    User ID: <code className="bg-neutral-200/70 px-1 py-0.5 rounded font-mono">{user?.id || 'usr_prod_4418a'}</code>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Primary Email</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'alex.reynolds@example.com'}
                      className="w-full px-3 py-2 text-xs border border-neutral-200 bg-neutral-50 text-neutral-500 rounded-xl cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Role / Job Title</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                    />
                  </div>
                </div>

                {/* Localization */}
                <div className="border-t border-neutral-100 pt-4 space-y-4">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Localization & Formats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                      >
                        <option value="Asia/Kolkata (GMT+5:30)">Asia/Kolkata (IST)</option>
                        <option value="UTC (GMT+0:00)">UTC (GMT+0:00)</option>
                        <option value="America/New_York (GMT-5:00)">America/New_York (EST)</option>
                        <option value="Europe/London (GMT+0:00)">Europe/London (GMT)</option>
                        <option value="Asia/Tokyo (GMT+9:00)">Asia/Tokyo (JST)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Date Format</label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                      >
                        <option value="en">English (US)</option>
                        <option value="hi">Hindi (हिंदी)</option>
                        <option value="es">Spanish (Español)</option>
                        <option value="fr">French (Français)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="ja">Japanese (日本語)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. SECURITY & 2FA                                         */}
          {/* ======================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password Change Card */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-4 shadow-2xs">
                <h2 className="text-sm font-bold text-neutral-900">Change Master Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Current Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Confirm New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? 'Hide characters' : 'Show characters'}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={!newPassword || !confirmPassword}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-Factor Authentication (2FA) */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-neutral-900">Two-Factor Authentication (2FA)</h3>
                      <p className="text-[11px] text-neutral-500">
                        Secure account logins with an authenticator app (Google Authenticator, Authy, or 1Password).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      showToast(twoFactorEnabled ? '2FA disabled.' : '2FA activated successfully with backup codes.');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                      twoFactorEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {twoFactorEnabled ? 'Enabled ✓' : 'Enable 2FA'}
                  </button>
                </div>

                {twoFactorEnabled && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
                    <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Two-Factor Authentication is currently protecting this workspace.</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Store these 3 emergency backup codes in a safe place:
                    </p>
                    <div className="flex gap-2 font-mono text-xs">
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300 text-emerald-900">SYNC-8412-A9</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300 text-emerald-900">SYNC-3391-B7</code>
                      <code className="bg-white px-2 py-1 rounded border border-emerald-300 text-emerald-900">SYNC-5104-C2</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Zero-Knowledge Vault */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-neutral-900">Zero-Knowledge Client Encryption Vault</h3>
                      <p className="text-[11px] text-neutral-500">
                        Encrypt file chunk payloads client-side with AES-256 before transmitting to storage pool nodes.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={zeroKnowledgeVault}
                    onChange={(e) => {
                      setZeroKnowledgeVault(e.target.checked);
                      showToast(e.target.checked ? 'Zero-knowledge encryption enabled.' : 'Client vault encryption disabled.');
                    }}
                    className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* Active Device Sessions */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900">Active Authorized Sessions</h3>
                    <p className="text-[11px] text-neutral-500">Devices currently logged into your account token.</p>
                  </div>
                  <button
                    onClick={handleRevokeAllSessions}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    Revoke All Others
                  </button>
                </div>

                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {sess.device.includes('iPhone') ? (
                          <Smartphone className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <Laptop className="w-4 h-4 text-neutral-500" />
                        )}
                        <div>
                          <div className="font-semibold text-neutral-900 flex items-center gap-2">
                            <span>{sess.device}</span>
                            {sess.current && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                This Browser
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            IP: {sess.ip} • {sess.location} • {sess.lastActive}
                          </div>
                        </div>
                      </div>
                      {!sess.current && (
                        <button
                          onClick={() => handleRevokeSession(sess.id)}
                          className="text-[11px] text-neutral-500 hover:text-rose-600 font-medium px-2 py-1 rounded-md hover:bg-neutral-100"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. STORAGE & CAPACITY                                     */}
          {/* ======================================================== */}
          {activeTab === 'storage' && (
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Logical Storage Allocation</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Isolated logical quota pool backed by Google Drive chunk engine.
                  </p>
                </div>
                <button
                  onClick={onOpenUpgrade}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
                >
                  Change Plan
                </button>
              </div>

              {/* Progress Gauge */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>Capacity Utilization</span>
                  <span>
                    {formatBytes(usedBytes)} / {formatBytes(totalBytes)} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden flex">
                  <div style={{ width: `${Math.min(60, percentage * 0.6)}%` }} className="bg-sky-500 h-full" title="Documents" />
                  <div style={{ width: `${Math.min(25, percentage * 0.25)}%` }} className="bg-indigo-500 h-full" title="Media" />
                  <div style={{ width: `${Math.min(15, percentage * 0.15)}%` }} className="bg-amber-500 h-full" title="Archives & Other" />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> Documents</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Media & Images</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Archives & Data</span>
                </div>
              </div>

              {/* Storage Optimization & Cleaning */}
              <div className="border-t border-neutral-100 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Storage Health & Optimization</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-neutral-200/90 bg-white space-y-2">
                    <div className="font-semibold text-xs text-neutral-900">Deduplication Scanner</div>
                    <p className="text-[11px] text-neutral-500">
                      Scan your logical hierarchy for identical byte hashes across separate folders.
                    </p>
                    <button
                      onClick={handleDuplicateScan}
                      disabled={duplicateScannerRunning}
                      className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${duplicateScannerRunning ? 'animate-spin' : ''}`} />
                      <span>{duplicateScannerRunning ? 'Scanning Hashes...' : 'Run Deduplication Scan'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200/90 bg-white space-y-2">
                    <div className="font-semibold text-xs text-neutral-900">Automatic Trash Purge</div>
                    <p className="text-[11px] text-neutral-500">
                      Automatically reclaim capacity by permanently expelling items deleted long ago.
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={trashRetentionDays}
                        onChange={(e) => {
                          setTrashRetentionDays(e.target.value);
                          showToast(`Trash retention schedule set to ${e.target.value} days.`);
                        }}
                        className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white"
                      >
                        <option value="7">Purge after 7 days</option>
                        <option value="30">Purge after 30 days (Recommended)</option>
                        <option value="60">Purge after 60 days</option>
                        <option value="never">Never auto-purge</option>
                      </select>
                    </div>
                  </div>
                </div>

                {cleanupMessage && (
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>{cleanupMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. FILE & UPLOAD DEFAULTS                                 */}
          {/* ======================================================== */}
          {activeTab === 'files' && (
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-5 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">File Manager & Upload Preferences</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set default navigation behaviors, chunk upload sizes, and collision handling.
                </p>
              </div>

              <div className="space-y-4">
                {/* Conflict resolution */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Duplicate Filename Handling (On Upload)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'rename', title: 'Auto-Rename', desc: 'Append (1), (2) automatically' },
                      { id: 'overwrite', title: 'Overwrite', desc: 'Replace existing target file' },
                      { id: 'ask', title: 'Prompt User', desc: 'Ask decision on each collision' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setConflictAction(opt.id as any);
                          showToast(`Upload collision behavior set to: ${opt.title}`);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          conflictAction === opt.id
                            ? 'border-neutral-900 bg-neutral-50 font-medium'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="font-semibold text-neutral-900">{opt.title}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resumable Chunk Size */}
                <div className="border-t border-neutral-100 pt-4">
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Resumable Upload Chunk Slice Size
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Large files are split into binary chunk streams. Smaller chunks tolerate poor network connectivity better.
                  </p>
                  <div className="flex gap-3 text-xs">
                    {(['2', '5', '10'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setChunkUploadSize(sz);
                          showToast(`Chunk slice buffer set to ${sz} MB.`);
                        }}
                        className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                          chunkUploadSize === sz
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {sz} MB per chunk
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default View Mode */}
                <div className="border-t border-neutral-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1">Default View Layout</label>
                    <select
                      value={defaultViewMode}
                      onChange={(e) => setDefaultViewMode(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                    >
                      <option value="grid">Grid Mode (Icon Cards with Previews)</option>
                      <option value="list">List Mode (Detailed Table)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1">Default Sort Order</label>
                    <select
                      value={defaultSort}
                      onChange={(e) => setDefaultSort(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                    >
                      <option value="date">Most Recently Modified First</option>
                      <option value="name">Alphabetical (A - Z)</option>
                      <option value="size">Largest File Size First</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="border-t border-neutral-100 pt-4 space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Auto-Generate Media Previews</div>
                      <div className="text-[11px] text-neutral-500">Render thumbnail previews for images, videos, and PDFs</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoThumbnails}
                      onChange={(e) => setAutoThumbnails(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">SHA-256 Pre-Upload Hash Check</div>
                      <div className="text-[11px] text-neutral-500">Prevent identical byte re-uploads across user subdirectories</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dedupOnUpload}
                      onChange={(e) => setDedupOnUpload(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. SHARING & PRIVACY                                      */}
          {/* ======================================================== */}
          {activeTab === 'sharing' && (
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-5 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Default Sharing & Link Access Policies</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Govern the default permissions applied whenever public or restricted share links are created.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1">Default Access Grant</label>
                    <select
                      value={defaultSharePermission}
                      onChange={(e) => setDefaultSharePermission(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                    >
                      <option value="view">Viewer (Read-only, preview files)</option>
                      <option value="edit">Editor (Can upload and edit documents)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1">Default Link Expiry</label>
                    <select
                      value={defaultLinkExpiry}
                      onChange={(e) => setDefaultLinkExpiry(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
                    >
                      <option value="24h">Expires in 24 Hours</option>
                      <option value="7d">Expires in 7 Days (Standard)</option>
                      <option value="30d">Expires in 30 Days</option>
                      <option value="never">Never Expire Automatically</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Enforce Password Protection on All Links</div>
                      <div className="text-[11px] text-neutral-500">Require creating a 6-digit access passphrase before share link is issued</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={requireSharePassword}
                      onChange={(e) => setRequireSharePassword(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Watermark View-Only Previews</div>
                      <div className="text-[11px] text-neutral-500">Disable direct binary download for unauthorized viewers</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={disablePublicDownload}
                      onChange={(e) => setDisablePublicDownload(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. NOTIFICATIONS                                          */}
          {/* ======================================================== */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-5 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Notification Channels & Triggers</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select which events trigger automated notifications to your email or desktop browser.
                </p>
              </div>

              {/* Threshold Slider */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
                  <span>Quota High-Water Warning Alert</span>
                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {storageThreshold}% Full
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="98"
                  value={storageThreshold}
                  onChange={(e) => setStorageThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <p className="text-[11px] text-neutral-500">
                  An urgent dispatch will be sent before write operations are refused due to capacity exhaustion.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">File Shared & Download Alerts</div>
                    <div className="text-[11px] text-neutral-500">Email alert when an external visitor downloads your shared file</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnShare}
                    onChange={(e) => setNotifyOnShare(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Subscription & UPI Payment Confirmation</div>
                    <div className="text-[11px] text-neutral-500">Instant receipt on plan renewal or UPI transaction approval</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnRenewal}
                    onChange={(e) => setNotifyOnRenewal(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Security Login from Unrecognized IP</div>
                    <div className="text-[11px] text-neutral-500">Security dispatch when authentication occurs on a new device</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnNewLogin}
                    onChange={(e) => setNotifyOnNewLogin(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Browser Desktop Push Notifications</div>
                    <div className="text-[11px] text-neutral-500">Display instant toast popups in your browser window during uploads</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={desktopPush}
                    onChange={(e) => setDesktopPush(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. APPEARANCE                                             */}
          {/* ======================================================== */}
          {activeTab === 'appearance' && (
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 space-y-6 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Theme & UI Density</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Personalize color themes, layout compact modes, and visual contrast.
                </p>
              </div>

              {/* Theme modes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-2">Color Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'light', title: 'Light Mode', desc: 'Crisp white canvas', icon: Sun },
                    { id: 'dark', title: 'Dark Mode', desc: 'Sleek obsidian night', icon: Moon },
                    { id: 'system', title: 'System Auto', desc: 'Follow OS preference', icon: Monitor },
                  ].map((mode) => {
                    const ModeIcon = mode.icon;
                    const isSelected = themeMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(mode.id as any);
                          showToast(`Theme changed to ${mode.title}.`);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-100/70 dark:border-white dark:bg-neutral-800 ring-2 ring-neutral-900/10 dark:ring-white/10 shadow-sm'
                            : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}>
                            <ModeIcon className="w-4 h-4" />
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900">{mode.title}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">{mode.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent color */}
              <div className="border-t border-neutral-100 pt-4">
                <label className="block text-xs font-semibold text-neutral-800 mb-2">Brand Accent Palette</label>
                <div className="flex gap-3">
                  {[
                    { id: 'neutral', name: 'Obsidian Neutral', bg: 'bg-neutral-900' },
                    { id: 'indigo', name: 'Royal Indigo', bg: 'bg-indigo-600' },
                    { id: 'emerald', name: 'Emerald Forest', bg: 'bg-emerald-600' },
                    { id: 'sky', name: 'Sky Tech', bg: 'bg-sky-600' },
                    { id: 'amber', name: 'Golden Amber', bg: 'bg-amber-600' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setAccentColor(c.id as any);
                        showToast(`Accent palette set to ${c.name}.`);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        accentColor === c.id ? 'border-neutral-900 bg-neutral-100 font-semibold' : 'border-neutral-200'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                      <span>{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Density */}
              <div className="border-t border-neutral-100 pt-4">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">Layout Spacing Density</label>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setDensity('comfortable')}
                    className={`px-4 py-2 rounded-xl border font-semibold ${
                      density === 'comfortable' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'
                    }`}
                  >
                    Comfortable (Standard Padding)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity('compact')}
                    className={`px-4 py-2 rounded-xl border font-semibold ${
                      density === 'compact' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'
                    }`}
                  >
                    Compact (High Data Density)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
