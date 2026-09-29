'use client';

import React from "react";
import {
  HardDrive,
  Sparkles,
  Layers,
  Share2,
  PieChart,
  ShieldCheck,
  FolderTree,
  Zap,
  Lock,
  ArrowRight
} from "lucide-react";

interface FeaturesSectionProps {
  onNavigate: (path: string) => void;
}

export function FeaturesSection({ onNavigate }: FeaturesSectionProps) {
  const features = [
    {
      icon: Sparkles,
      title: "25 GB Free Trial",
      description:
        "Every new registered account receives an instant 25 GB free trial allocation with zero billing friction.",
      badge: "Instant Perk"
    },
    {
      icon: HardDrive,
      title: "Logical Storage Pool",
      description:
        "Forget about raw server fragments. Access your total capacity through a unified, high-availability virtual pool.",
      badge: "Architecture"
    },
    {
      icon: FolderTree,
      title: "Enterprise File Manager",
      description:
        "Complete folder hierarchies, breadcrumb navigation, search filters, and fluid switching between Grid and List views.",
      badge: "Productivity"
    },
    {
      icon: Zap,
      title: "High-Speed Parallel Uploads",
      description:
        "Multi-file drag-and-drop ingestion with simulated granular progress bars, pause, retry, and cancellation controls.",
      badge: "Performance"
    },
    {
      icon: Share2,
      title: "Granular File Sharing",
      description:
        "Generate direct links or invite collaborators with dedicated Viewer or Editor permission constraints.",
      badge: "Collaboration"
    },
    {
      icon: PieChart,
      title: "Storage Analytics",
      description:
        "Real-time visual breakdowns across Documents, Videos, Images, Applications, and Archives with usage tracking.",
      badge: "Insights"
    },
    {
      icon: ShieldCheck,
      title: "Reliable Cloud Backups",
      description:
        "High-performance logical storage volumes with instant synchronization, automated recovery, and robust uptime guarantees.",
      badge: "Reliability"
    },
    {
      icon: Lock,
      title: "End-to-End Security Architecture",
      description:
        "Protected logical layer, encrypted transfers, and completely isolated credentials preventing leakages.",
      badge: "Security"
    }
  ];

  return (
    <section className="py-20 bg-neutral-50/50 dark:bg-neutral-900/30 border-y border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2">
            Engineered For Scale
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Everything you need in modern cloud storage
          </h3>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            From quick personal file backups to multi-terabyte organizational pools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {feat.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight mb-2">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => onNavigate("/pricing")}
            className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400"
          >
            <span>View all storage plans and feature comparisons</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
