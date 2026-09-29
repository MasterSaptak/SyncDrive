'use client';

import React, { useEffect, useState } from "react";
import { Hero } from "./Hero";
import { FeaturesSection } from "./FeaturesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { PricingSection } from "./PricingSection";
import { SecuritySection } from "./SecuritySection";
import { Sparkles, Layers, Workflow, CreditCard, ShieldCheck } from "lucide-react";

interface LandingPageProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
  onSelectPlan?: (planId: string) => void;
}

export function LandingPage({ currentPath = "/", onNavigate, onSelectPlan }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState<string>("overview");

  // Smoothly scroll to the target section whenever currentPath changes
  useEffect(() => {
    const clean = currentPath.replace(/^#\/?/, "").replace(/^\//, "");
    if (clean && clean !== "" && clean !== "/") {
      const sectionId = clean === "about" ? "security" : clean;
      setActiveSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) {
        const timeout = setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
        return () => clearTimeout(timeout);
      }
    } else {
      setActiveSection("overview");
    }
  }, [currentPath]);

  // Track active section on scroll
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    };

    const sectionElements = ["features", "how-it-works", "pricing", "security"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sectionElements.forEach((el) => observer.observe(el));

    // Handle scroll to top for overview
    const handleScroll = () => {
      if (window.scrollY < 300) {
        setActiveSection("overview");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToSection = (id: string, path: string) => {
    setActiveSection(id);
    onNavigate(path);
    if (id === "overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const sections = [
    { id: "overview", path: "/", label: "Overview", icon: Sparkles },
    { id: "features", path: "/features", label: "Features", icon: Layers },
    { id: "how-it-works", path: "/how-it-works", label: "How It Works", icon: Workflow },
    { id: "pricing", path: "/pricing", label: "Pricing Plans", icon: CreditCard },
    { id: "security", path: "/security", label: "Security", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      <Hero onNavigate={onNavigate} />

      {/* Quick Jump Section Bar */}
      <div className="sticky top-16 z-30 py-2.5 px-4 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-y border-neutral-200/80 dark:border-neutral-800/80 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id, sec.path)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id="features" className="scroll-mt-32">
        <FeaturesSection onNavigate={onNavigate} />
      </div>

      <div id="how-it-works" className="scroll-mt-32">
        <HowItWorksSection onNavigate={onNavigate} />
      </div>

      <div id="pricing" className="scroll-mt-32">
        <PricingSection
          onNavigate={onNavigate}
          onSelectPlanForPayment={(plan) => onSelectPlan?.(plan.id)}
        />
      </div>

      <div id="security" className="scroll-mt-32">
        <SecuritySection />
      </div>
    </div>
  );
}
