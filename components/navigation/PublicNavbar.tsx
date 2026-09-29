'use client';

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { HardDrive, Sun, Moon, Menu, X, ArrowRight, Sparkles, User } from "lucide-react";

interface PublicNavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function PublicNavbar({ currentPath, onNavigate }: PublicNavbarProps) {
  const { user, isAuthenticated, openAuthGate } = useAuth();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Features", path: "/features", id: "features" },
    { name: "How It Works", path: "/how-it-works", id: "how-it-works" },
    { name: "Pricing & Plans", path: "/pricing", id: "pricing" },
    { name: "Security", path: "/security", id: "security" },
  ];

  const handleNavClick = (link: (typeof navLinks)[0]) => {
    onNavigate(link.path);
    setTimeout(() => {
      const element = document.getElementById(link.id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 30);
  };

  const isLinkActive = (link: (typeof navLinks)[0]) => {
    const clean = currentPath?.replace(/^#\/?/, "").replace(/^\//, "");
    return clean === link.id || currentPath === link.path;
  };

  const handleTrialClick = () => {
    if (isAuthenticated) {
      onNavigate("/dashboard");
    } else {
      onNavigate("/register");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => onNavigate("/")}
          className="flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
              SyncDrive
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                SaaS
              </span>
            </span>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => handleNavClick(link)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLinkActive(link)
                  ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 font-semibold"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70"
              }`}
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* Right Action Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            )}
            <span className="text-[11px] font-semibold hidden xl:inline">
              {resolvedTheme === "dark" ? "Light" : "Dark"}
            </span>
          </button>

          {isAuthenticated ? (
            <button
              onClick={() => onNavigate("/dashboard")}
              className="py-2 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <span>My Storage Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate("/login")}
                className="py-2 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 hover:border-sky-500 dark:hover:border-sky-400 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                title="Customer Sign In"
              >
                <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Customer Login</span>
              </button>

              <button
                onClick={handleTrialClick}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Claim 25 GB Free</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            aria-label="Toggle theme"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-4 space-y-3">
          {/* Quick theme toggle in drawer */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200"
          >
            <span className="flex items-center gap-2">
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-sky-500" />
              )}
              <span>Appearance: {resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </span>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold">
              Toggle
            </span>
          </button>

          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleNavClick(link);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  isLinkActive(link)
                    ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 font-semibold"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("/dashboard");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 text-white font-semibold text-xs flex items-center justify-center gap-2"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate("/login");
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs text-center flex items-center justify-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Customer Login</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate("/register");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs text-center flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account & 25 GB Free Trial</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
