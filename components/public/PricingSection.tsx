'use client';

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { INITIAL_PLANS } from "@/lib/mock-data";
import { StoragePlan } from "@/types/plan";
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";

interface PricingSectionProps {
  onNavigate: (path: string) => void;
  onSelectPlanForPayment?: (plan: StoragePlan, billingCycle: "monthly" | "yearly") => void;
}

export function PricingSection({ onNavigate, onSelectPlanForPayment }: PricingSectionProps) {
  const { isAuthenticated, openAuthGate } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = INITIAL_PLANS;

  const handleSelectPlan = (plan: StoragePlan) => {
    if (!isAuthenticated) {
      if (plan.id === "plan-trial") {
        onNavigate("/register");
        return;
      }
      // Prompt Section 7 & 8: Authentication gate
      openAuthGate({
        planId: plan.id,
        title: "Login Required",
        message: `Please create an account or log in before purchasing the ${plan.name} storage plan.`
      });
      return;
    }

    if (plan.id === "plan-trial") {
      onNavigate("/dashboard");
    } else {
      if (onSelectPlanForPayment) {
        onSelectPlanForPayment(plan, billingCycle);
      } else {
        onNavigate(`/plans?selected=${plan.id}&cycle=${billingCycle}`);
      }
    }
  };

  return (
    <section className="py-20 bg-white dark:bg-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Logical Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Predictable Plans. Zero Hidden Limits.
          </h2>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Start with our full-featured 25 GB free trial, then scale effortlessly into high-capacity pools.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`py-2 px-4 rounded-lg transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.slice(0, 4).map((plan) => {
            const isPopular = plan.popular;
            const isTrial = plan.id === "plan-trial";
            const displayPrice =
              isTrial
                ? "₹0"
                : billingCycle === "yearly"
                ? `₹${plan.price * 10}`
                : `₹${plan.price}`;

            const periodLabel = isTrial
              ? "30-day trial"
              : billingCycle === "yearly"
              ? "/ year"
              : "/ month";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-sky-500 dark:border-sky-500 bg-sky-50/20 dark:bg-sky-950/10 shadow-xl"
                    : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md"
                }`}
              >
                {plan.highlightText && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-bold tracking-wider uppercase shadow-sm">
                    {plan.highlightText}
                  </div>
                )}

                <div>
                  <div className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                    {plan.name}
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                      {displayPrice}
                    </span>
                    <span className="text-xs text-neutral-500">{periodLabel}</span>
                  </div>

                  <div className="mt-1 text-xs text-neutral-500">
                    {isTrial ? "Requires account authentication" : `${plan.storageGB} GB logical pool allocation`}
                  </div>

                  <hr className="my-5 border-neutral-200 dark:border-neutral-800" />

                  <div className="space-y-2.5 text-xs">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-neutral-700 dark:text-neutral-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? "bg-sky-600 hover:bg-sky-500 text-white shadow-md hover:shadow-lg"
                        : isTrial
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm"
                        : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white"
                    }`}
                  >
                    <span>{isTrial ? "Start Free Trial" : `Choose ${plan.name}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Higher Tier Expansion (1 TB, 2 TB, 5 TB) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.slice(4).map((plan) => {
            const displayPrice =
              billingCycle === "yearly" ? `₹${plan.price * 10}` : `₹${plan.price}`;
            const periodLabel = billingCycle === "yearly" ? "/ year" : "/ month";

            return (
              <div
                key={plan.id}
                className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                      {plan.name} Power Pool
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      High Capacity
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white">
                      {displayPrice}
                    </span>
                    <span className="text-xs text-neutral-500">{periodLabel}</span>
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    High throughput pool with dedicated bandwidth priority.
                  </p>

                  <div className="mt-4 space-y-2 text-xs">
                    {plan.features.slice(0, 4).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Select {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Callout */}
        <div className="mt-12 p-6 rounded-3xl bg-neutral-100/70 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                Need more than 5 TB or dedicated single-tenant infrastructure?
              </div>
              <div className="text-xs text-neutral-500">
                Custom storage pools with negotiated SLA and billing terms are available.
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate("/about")}
            className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-bold shrink-0 transition-colors"
          >
            Contact Architecture Team
          </button>
        </div>
      </div>
    </section>
  );
}
