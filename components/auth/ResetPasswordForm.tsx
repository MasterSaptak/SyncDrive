'use client';

import React, { useState } from "react";
import { authService } from "../../services/auth";
import { Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

interface ResetPasswordFormProps {
  onNavigate: (path: string) => void;
}

export function ResetPasswordForm({ onNavigate }: ResetPasswordFormProps) {
  const { showToast } = useNotification();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      // The token is handled automatically by Supabase client from URL hash,
      // so we pass a dummy token or let the service ignore it.
      await authService.resetPassword("auto-handled-by-supabase", password);
      setSuccess(true);
      showToast("Password updated successfully", "success");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset password. The link might be expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="w-full text-center space-y-4">
        <div className="flex justify-center mb-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Password Updated</h3>
        <p className="text-xs text-neutral-500">Your password has been successfully changed.</p>
        <button
          onClick={() => onNavigate("/login")}
          className="w-full py-3 px-4 mt-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition-all"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
      >
        <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
