'use client';

import React from 'react';
import { LogicalQuota } from '@/types';
import { QuotaMeter } from './QuotaMeter';
import {
  FolderOpen,
  Clock,
  Star,
  Users,
  Trash2,
  CreditCard,
  Settings,
  HardDrive,
  Sun,
  Moon,
  X,
  Cloud,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export type ActiveTab =
  | 'files'
  | 'recent'
  | 'starred'
  | 'shared'
  | 'trash'
  | 'subscription'
  | 'settings'
  | 'audit';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  quota: LogicalQuota | null;
  trashCount?: number;
  starredCount?: number;
  userRole?: string;
  onRefreshQuota: () => void;
  onOpenUpgrade: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  quota,
  trashCount = 0,
  starredCount = 0,
  userRole,
  onRefreshQuota,
  onOpenUpgrade,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const navItems = [
    {
      id: 'files' as ActiveTab,
      label: 'My Files',
      icon: FolderOpen,
      badge: null,
    },
    {
      id: 'recent' as ActiveTab,
      label: 'Recent',
      icon: Clock,
      badge: null,
    },
    {
      id: 'starred' as ActiveTab,
      label: 'Starred',
      icon: Star,
      badge: starredCount > 0 ? starredCount : null,
    },
    {
      id: 'shared' as ActiveTab,
      label: 'Shared with me',
      icon: Users,
      badge: null,
    },
    {
      id: 'trash' as ActiveTab,
      label: 'Trash',
      icon: Trash2,
      badge: trashCount > 0 ? trashCount : null,
    },
    {
      id: 'subscription' as ActiveTab,
      label: 'Subscription',
      icon: CreditCard,
      badge: null,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  const handleItemClick = (tabId: ActiveTab) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavContent = () => (
    <>
      {/* Top Nav Items */}
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase px-3 mb-2">
            Storage Space
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xs font-semibold'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-neutral-950' : 'text-neutral-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-neutral-800 dark:bg-neutral-200 text-neutral-200 dark:text-neutral-800'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logical Quota Principle Breakdown */}
        <div>
          <div className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase px-3 mb-2">
            Capacity Accounting
          </div>
          <QuotaMeter quota={quota} onRefresh={onRefreshQuota} />
        </div>
      </div>

      {/* Bottom Info / Upgrade Help */}
      <div className="pt-4 border-t border-neutral-200/70 dark:border-neutral-800 space-y-2">
        <div className="p-3 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-xs">
          <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-neutral-500" />
              <span>Logical Quota</span>
            </span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-bold">Active</span>
          </div>
          <p className="text-[11px] text-neutral-500 mb-2">
            Backend storage is multi-node load balanced across the 50 TB cluster.
          </p>
          <button
            onClick={() => {
              onOpenUpgrade();
              onCloseMobile?.();
            }}
            className="w-full text-center py-2 text-[11px] font-semibold text-neutral-900 dark:text-white hover:text-neutral-700 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 rounded-lg transition-colors cursor-pointer"
          >
            Manage Subscription
          </button>
          <button
            onClick={toggleTheme}
            className="w-full mt-2 flex items-center justify-between px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              {resolvedTheme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span>{resolvedTheme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">Toggle</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 flex-col justify-between p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Slide-Over Off-Canvas Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col justify-between p-4 overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">SyncDrive</span>
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded">
                      Cloud
                    </span>
                  </div>
                </div>

                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
