'use client';

import React from "react";
import { UserLoginForm } from "./UserLoginForm";
import { RegisterForm } from "./RegisterForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ToastContainer } from "../common/ToastContainer";
import { Cloud, ArrowLeft } from "lucide-react";

interface AuthPageProps {
  mode: "user-login" | "register" | "forgot-password";
  onNavigate: (path: string) => void;
  onSuccess: () => void;
}

export function AuthPage({ mode, onNavigate, onSuccess }: AuthPageProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative font-sans transition-colors">
      {/* Return home link */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => onNavigate("/")}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to SyncDrive</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          onClick={() => onNavigate("/")}
          className="inline-flex items-center gap-2.5 cursor-pointer select-none mb-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Cloud className="w-6 h-6 fill-white/20" />
          </div>
          <span className="font-black text-xl tracking-tight text-neutral-900 dark:text-white">
            Sync<span className="text-sky-600 dark:text-sky-400">Drive</span>
          </span>
        </div>

        <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
          {mode === "user-login" && "Sign in to your SyncDrive"}
          {mode === "register" && "Start your 30-Day Free Trial"}
          {mode === "forgot-password" && "Reset your password"}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {mode === "user-login" && "Access your personal files, folders, and encrypted volumes"}
          {mode === "register" && "25 GB high-performance cloud storage, no credit card required"}
          {mode === "forgot-password" && "Enter your email to receive recovery instructions"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-neutral-900 py-8 px-6 sm:px-8 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-3xl">
          {mode === "user-login" && (
            <UserLoginForm onNavigate={onNavigate} />
          )}

          {mode === "register" && (
            <RegisterForm onNavigate={onNavigate} />
          )}

          {mode === "forgot-password" && (
            <ForgotPasswordForm onNavigate={onNavigate} />
          )}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
