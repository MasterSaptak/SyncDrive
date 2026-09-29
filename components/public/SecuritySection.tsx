'use client';

import React from "react";
import { ShieldCheck, Lock, EyeOff, Server, KeyRound, CheckCircle2 } from "lucide-react";

export function SecuritySection() {
  const pillars = [
    {
      icon: EyeOff,
      title: "Zero Shard Exposure",
      description:
        "The client layer communicates strictly with logical API abstractions. Raw storage buckets, routing nodes, and multi-tenant physical fragments are never disclosed to the browser."
    },
    {
      icon: Lock,
      title: "Protected Session Tokens",
      description:
        "Strict token-based authentication and scoped permission boundaries ensure that unauthorized parties cannot inspect or mutate file streams."
    },
    {
      icon: Server,
      title: "Isolated Virtual Volumes",
      description:
        "Every user's allocation operates within an isolated namespace. Shared files require explicit permission grants with viewer or editor tokens."
    },
    {
      icon: KeyRound,
      title: "Credential Concealment",
      description:
        "No master secret keys, database credentials, or third-party service provider secrets exist within frontend bundles. All authorization runs server-authoritative."
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Enterprise Security Model</span>
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Security by Strict Logical Isolation
          </h3>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            A trustworthy storage platform designed with strict physical abstraction and defensive user session controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-1.5">
                    {pillar.title}
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Two-Factor Authentication Support
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Session Invalidation & Multi-Device Logout
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Comprehensive User Activity Logs
          </span>
        </div>
      </div>
    </section>
  );
}
