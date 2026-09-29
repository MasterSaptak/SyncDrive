'use client';

import React from "react";
import { HardDrive, ShieldCheck, Lock, Globe, Server } from "lucide-react";

interface PublicFooterProps {
  onNavigate: (path: string) => void;
}

export function PublicFooter({ onNavigate }: PublicFooterProps) {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand & Architecture */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white">
                <HardDrive className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-neutral-900 dark:text-white">SyncDrive</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Enterprise-ready logical storage management. Seamless pooling, encrypted transfers, and zero-fragment user abstraction.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>SOC2 & ISO 27001 Logical Standards</span>
            </div>
          </div>

          {/* Col 2: Solutions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate("/features")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  Storage Features
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("/how-it-works")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("/pricing")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  Plans & 25 GB Free Trial
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("/security")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  Security Architecture
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Authentication Access */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
              Portals & Access
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate("/login")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  Customer Sign In
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("/register")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  Create Customer Account (25 GB Free)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("/forgot-password")} className="text-neutral-600 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400">
                  Account Recovery
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Specs */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
              Compliance & Security
            </h4>
            <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <p className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-neutral-400" />
                <span>Isolated Logical Pools</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>TLS 1.3 In-Flight Encryption</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                <span>Multi-Region High Availability</span>
              </p>
            </div>
            <div className="mt-4 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400">
              Physical storage architecture, credentials, and backend routing nodes are strictly isolated from client interfaces.
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div>© {new Date().getFullYear()} SyncDrive Technologies Inc. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span className="hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">System Status (99.99%)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
