'use client';

import React, { useState } from 'react';
import { UserProfile, LogicalQuota } from '@/types';
import { QuotaMeter } from './QuotaMeter';
import {
  Cloud,
  Sparkles,
  User,
  ChevronDown,
  Search,
  SlidersHorizontal,
  FolderPlus,
  UploadCloud,
  Layers,
  X,
  Settings,
  CreditCard,
  LogOut,
  ArrowLeftRight,
  Sun,
  Moon,
  Menu,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export interface SearchFilters {
  query: string;
  mimeType: string;
  sizeRange: string;
  dateRange: string;
}

interface NavbarProps {
  user: UserProfile | null;
  quota: LogicalQuota | null;
  searchFilters?: SearchFilters;
  onSearchChange?: (filters: Partial<SearchFilters>) => void;
  onClearSearch?: () => void;
  onNewFolder?: () => void;
  onUploadClick?: () => void;
  onResumableUploadClick?: () => void;
  onOpenUpgrade: () => void;
  onOpenSettings?: () => void;
  onRefreshQuota: () => void;
  onOpenAuth?: () => void;
  onSwitchAccount?: () => void;
  onSignOut?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  quota,
  searchFilters,
  onSearchChange,
  onClearSearch,
  onNewFolder,
  onUploadClick,
  onResumableUploadClick,
  onOpenUpgrade,
  onOpenSettings,
  onRefreshQuota,
  onOpenAuth,
  onSwitchAccount,
  onSignOut,
  onToggleMobileMenu,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const hasActiveFilters = Boolean(
    searchFilters &&
      (searchFilters.query ||
        (searchFilters.mimeType && searchFilters.mimeType !== 'all') ||
        (searchFilters.sizeRange && searchFilters.sizeRange !== 'all') ||
        (searchFilters.dateRange && searchFilters.dateRange !== 'all'))
  );

  return (
    <header className="h-16 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
      {/* Mobile Search Active Bar Overlay */}
      {mobileSearchOpen && searchFilters && onSearchChange ? (
        <div className="flex sm:hidden items-center gap-2 w-full animate-in fade-in duration-150">
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            aria-label="Close search"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchFilters.query}
              onChange={(e) => onSearchChange({ query: e.target.value })}
              placeholder="Search files..."
              className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            {searchFilters.query && (
              <button
                onClick={() => onSearchChange({ query: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`p-2 rounded-xl border ${
              hasActiveFilters
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* 1. Left: Hamburger + Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              aria-label="Open mobile navigation drawer"
              title="Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 select-none">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 shadow-xs">
                <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold tracking-tight text-neutral-900 dark:text-white text-sm sm:text-base">SyncDrive</span>
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded">
                    Cloud
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 hidden sm:block">
                  Secure Logical Storage
                </div>
              </div>
            </div>

            {/* Desktop New / Create Dropdown Button */}
            {(onNewFolder || onUploadClick || onResumableUploadClick) && (
              <div className="relative ml-1 hidden sm:block">
                <button
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <span>+ Create</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showCreateMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowCreateMenu(false)}
                    />
                    <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-50 p-1 text-xs text-neutral-700 dark:text-neutral-300 animate-in fade-in zoom-in-95 duration-100">
                      {onNewFolder && (
                        <button
                          onClick={() => {
                            setShowCreateMenu(false);
                            onNewFolder();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2.5 cursor-pointer"
                        >
                          <FolderPlus className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                          <span>New Folder</span>
                        </button>
                      )}
                      {onUploadClick && (
                        <button
                          onClick={() => {
                            setShowCreateMenu(false);
                            onUploadClick();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2.5 cursor-pointer"
                        >
                          <UploadCloud className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                          <span>Upload Files</span>
                        </button>
                      )}
                      {onResumableUploadClick && (
                        <button
                          onClick={() => {
                            setShowCreateMenu(false);
                            onResumableUploadClick();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2.5 cursor-pointer"
                        >
                          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <div className="flex flex-col">
                            <span>Resumable Upload</span>
                            <span className="text-[10px] text-neutral-400">Chunked & recoverable</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 2. Middle: Desktop / Tablet Search with Metadata Filters */}
          {searchFilters && onSearchChange ? (
            <div className="hidden sm:block flex-1 max-w-xl mx-2 sm:mx-4 relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilters.query}
                  onChange={(e) => onSearchChange({ query: e.target.value })}
                  placeholder="Search files by name, type, date..."
                  className="w-full bg-neutral-100/70 hover:bg-neutral-100 focus:bg-white dark:bg-neutral-800/70 dark:hover:bg-neutral-800 dark:focus:bg-neutral-900 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 rounded-xl pl-9 pr-16 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 transition-all"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {hasActiveFilters && (
                    <button
                      onClick={onClearSearch}
                      title="Clear search and filters"
                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    title="Search filters"
                    className={`p-1 rounded-md transition-colors ${
                      hasActiveFilters
                        ? 'text-neutral-900 bg-neutral-200 dark:text-white dark:bg-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* 3. Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Icon Trigger (Only on `< sm` screens) */}
            {searchFilters && onSearchChange && (
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="sm:hidden p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                aria-label="Open search input"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Compact Quota Bar (Large screens) */}
            <div className="hidden lg:block">
              <QuotaMeter quota={quota} compact onRefresh={onRefreshQuota} />
            </div>

            {/* Upgrade CTA */}
            <button
              onClick={onOpenUpgrade}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-900 dark:text-white hover:text-black bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 border border-amber-200/80 dark:border-amber-800/80 rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Upgrade</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              )}
            </button>

            {/* User Profile Popover */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label="Account menu"
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-neutral-700 dark:text-neutral-200 overflow-hidden font-medium text-xs">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">
                    {user?.fullName || (user as any)?.name || 'Customer'}
                  </div>
                  <div className="text-[10px] text-neutral-400 capitalize">{quota?.planName || 'Pro Plan'}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
              </button>

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                      <div className="font-semibold text-neutral-900 dark:text-white">{user?.fullName || (user as any)?.name || 'Customer User'}</div>
                      <div className="text-neutral-400 text-[11px] truncate">{user?.email}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span>Subscription</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">
                          {quota?.planName || 'Pro'}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      {/* Theme Switcher Row in Popover */}
                      <div className="px-3 py-2 flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                        <span className="flex items-center gap-2">
                          {resolvedTheme === 'dark' ? (
                            <Moon className="w-4 h-4 text-sky-400" />
                          ) : (
                            <Sun className="w-4 h-4 text-amber-500" />
                          )}
                          <span>Appearance</span>
                        </span>
                        <button
                          onClick={toggleTheme}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                        >
                          {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                        </button>
                      </div>

                      {onOpenSettings && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenSettings();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-neutral-500" />
                          <span>Account Settings</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenUpgrade();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-neutral-500" />
                        <span>Manage Subscription</span>
                      </button>
                    </div>

                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1 space-y-0.5">
                      {(onSwitchAccount || onOpenAuth) && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            if (onSwitchAccount) onSwitchAccount();
                            else if (onOpenAuth) onOpenAuth();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg flex items-center gap-2.5 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <ArrowLeftRight className="w-4 h-4 text-sky-500" />
                          <span>Switch Account</span>
                        </button>
                      )}

                      {onSignOut && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onSignOut();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2.5 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Advanced Filters Popover (Shared for both desktop and mobile) */}
      {showFilterMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowFilterMenu(false)}
          />
          <div className="absolute left-2 right-2 sm:left-auto sm:right-6 top-16 mt-2 max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-4 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <span className="font-semibold text-neutral-900 dark:text-white">Search Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    onClearSearch?.();
                    setShowFilterMenu(false);
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">File Type</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'document', label: 'Documents' },
                  { id: 'image', label: 'Images' },
                  { id: 'video', label: 'Videos' },
                  { id: 'audio', label: 'Audio' },
                  { id: 'archive', label: 'Archives' },
                  { id: 'folder', label: 'Folders' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSearchChange?.({ mimeType: t.id });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      (searchFilters?.mimeType || 'all') === t.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Range */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">File Size</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Any size' },
                  { id: 'small', label: '< 1 MB' },
                  { id: 'medium', label: '1 MB – 50 MB' },
                  { id: 'large', label: '> 50 MB' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSearchChange?.({ sizeRange: s.id })}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      (searchFilters?.sizeRange || 'all') === s.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Modified */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">Date Modified</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Any time' },
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: 'Past 7 days' },
                  { id: '30d', label: 'Past 30 days' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSearchChange?.({ dateRange: d.id })}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      (searchFilters?.dateRange || 'all') === d.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

