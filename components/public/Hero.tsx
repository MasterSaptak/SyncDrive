'use client';

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  HardDrive,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  CheckCircle2,
  Lock,
  Zap
} from "lucide-react";

interface HeroProps {
  onNavigate: (path: string) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  const { openAuthGate, isAuthenticated } = useAuth();

  const handleClaimTrial = () => {
    if (isAuthenticated) {
      onNavigate("/dashboard");
    } else {
      onNavigate("/register");
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/10 dark:bg-sky-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Trial Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold mb-6 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>New: 25 GB Free Trial available for every authenticated account</span>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <button
              onClick={handleClaimTrial}
              className="font-bold underline hover:text-sky-600 dark:hover:text-sky-200"
            >
              Activate Now &rarr;
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-[1.15]">
            Unified Cloud Storage.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
              One Logical Pool.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            Experience enterprise-grade file management without physical storage fragmentation.
            Effortlessly pool, organize, preview, and share your digital assets with high-speed encryption.
          </p>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={handleClaimTrial}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start 25 GB Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate("/login")}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Customer Sign In</span>
            </button>

            <button
              onClick={() => onNavigate("/pricing")}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-sm transition-all"
            >
              Explore Paid Plans
            </button>
          </div>

          {/* Customer Portal Access Card */}
          <div className="mt-10 p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm max-w-lg mx-auto shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Customer Access Portal
              </span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                End-to-End Encrypted
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-left mb-3">
              Access your personal storage pool, manage encrypted files, or claim a new 25 GB account in seconds.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate("/login")}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-sky-500 dark:hover:border-sky-400 bg-white dark:bg-neutral-800 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Customer Login</span>
              </button>

              <button
                onClick={() => onNavigate("/register")}
                className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Account (25 GB)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visual Product Showcase Card (Logical Storage Pool Concept) */}
        <div className="mt-14 relative max-w-4xl mx-auto rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 shadow-2xl p-4 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Logical Storage Pool View</span>
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                500 GB Storage Tier
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pool Active
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                49% Utilized
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
              <div className="text-xs font-medium text-neutral-500">Total Storage Pool</div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                500 GB
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">High-speed logical allocation</div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60">
              <div className="text-xs font-medium text-sky-700 dark:text-sky-300">Used Storage</div>
              <div className="text-2xl font-bold text-sky-900 dark:text-sky-100 mt-1">
                245 GB
              </div>
              <div className="text-[11px] text-sky-600/80 dark:text-sky-400 mt-0.5">49% Capacity utilized</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Available Storage</div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                255 GB
              </div>
              <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">Ready for instant uploads</div>
            </div>
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/40 text-xs text-neutral-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Physical infrastructure and multi-account fragments are fully hidden from user space.</span>
            </div>
            <span className="font-mono text-[11px] text-neutral-400">Zero Shard Visibility</span>
          </div>
        </div>
      </div>
    </section>
  );
}
