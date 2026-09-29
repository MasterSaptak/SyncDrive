'use client';

import React from "react";
import { UserPlus, HardDrive, UploadCloud, Share2, ArrowRight } from "lucide-react";

interface HowItWorksSectionProps {
  onNavigate: (path: string) => void;
}

export function HowItWorksSection({ onNavigate }: HowItWorksSectionProps) {
  const steps = [
    {
      step: "01",
      icon: UserPlus,
      title: "Register Your Account",
      description:
        "Sign up in seconds. You instantly receive an active 25 GB free trial allocation in your private virtual pool with zero credit card requirements."
    },
    {
      step: "02",
      icon: UploadCloud,
      title: "Upload & Structure Assets",
      description:
        "Drag and drop documents, high-definition videos, source archives, or entire folder trees. Our parallel pipeline ingests files with live status tracking."
    },
    {
      step: "03",
      icon: HardDrive,
      title: "Zero-Fragment Logical Pool",
      description:
        "The underlying multi-cluster storage nodes are abstracted into a single logical volume. You monitor clean used vs available metrics seamlessly."
    },
    {
      step: "04",
      icon: Share2,
      title: "Collaborate & Share Safely",
      description:
        "Grant granular viewer or editor permissions, generate protected download links, and monitor file activity logs in real-time."
    }
  ];

  return (
    <section className="py-20 bg-neutral-50/70 dark:bg-neutral-900/40 border-t border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2">
            Seamless Workflow
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            How SyncDrive Operates
          </h3>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Engineered to remove friction between your files and cloud capacity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs font-black text-neutral-400 dark:text-neutral-600">
                      STEP {item.step}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => onNavigate("/register")}
            className="py-3 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-2 transition-all"
          >
            <span>Claim Your 25 GB Allocation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
