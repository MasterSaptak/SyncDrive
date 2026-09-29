'use client';

import React, { useState } from "react";
import { authService } from "../../services/auth";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

interface ForgotPasswordFormProps {
  onNavigate: (path: string) => void;
}

export function ForgotPasswordForm({ onNavigate }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter your registered email");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await authService.forgotPassword(email);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
          Reset Your Password
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Enter your registered email address to receive password recovery instructions.
        </p>
      </div>

      {successMessage ? (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            {successMessage}
          </div>
          <button
            onClick={() => onNavigate("/login")}
            className="w-full py-2 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Account Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? "Sending Link..." : "Send Reset Instructions"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <button
          onClick={() => onNavigate("/login")}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}
