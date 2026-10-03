'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { User, Mail, Lock, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

interface RegisterFormProps {
  onNavigate: (path: string) => void;
  returnUrl?: string;
}

export function RegisterForm({ onNavigate, returnUrl }: RegisterFormProps) {
  const { sendVerificationOTP, verifyOTPAndRegister, loginWithGoogle } = useAuth();
  const { showToast } = useNotification();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [verificationMode, setVerificationMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (!agreeTerms) {
      setErrorMessage("Please accept the terms of service to proceed");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      if (verificationMode) {
        if (otpCode.length !== 6 && otpCode.length !== 0) {
           setErrorMessage("Please enter a valid verification code");
           setIsSubmitting(false);
           return;
        }
        await verifyOTPAndRegister(name, email, password, otpCode);
        showToast("Account verified and created! Your 25 GB Free Trial is active.", "success");
        onNavigate(returnUrl || "/dashboard");
      } else {
        await sendVerificationOTP(name, email, password);
        setVerificationMode(true);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await sendVerificationOTP(name, email, password);
      setResendCooldown(60);
      showToast("Verification code resent", "success");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await loginWithGoogle();
      // When OAuth is active, the browser redirects directly to accounts.google.com
    } catch (err: any) {
      setErrorMessage(err.message || "Google authentication failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Includes 25 GB Free Trial</span>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
          Create Your SyncDrive Account
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Get 25 GB complimentary logical storage pool on activation
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {verificationMode ? (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-center">
                Enter Verification Code
              </label>
              <p className="text-xs text-neutral-500 text-center mb-3">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
              <input
                type="text"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] font-mono py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || otpCode.length < 6}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Verifying..." : "Verify & Create Account"}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting || resendCooldown > 0}
                className="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline disabled:opacity-50 disabled:no-underline transition-all"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
              </button>
            </div>
            <div className="text-center mt-1">
              <button
                type="button"
                onClick={() => setVerificationMode(false)}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                Change email address
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajat Kumar"
                  className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
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

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Password
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
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm Password
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
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer text-xs text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-sky-600 focus:ring-sky-500"
                />
                <span>
                  I agree to the <Link href="/terms" className="text-sky-600 hover:underline">Terms of Service</Link> and Privacy Policy.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{isSubmitting ? "Sending Verification..." : "Create Account & Activate 25 GB Free"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </form>

      {/* Google Sign Up */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>
      </div>

      {/* Switch to login */}
      <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <span className="text-xs text-neutral-500">
          Already have an account?{" "}
          <button
            onClick={() => onNavigate("/login")}
            className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Sign In
          </button>
        </span>
      </div>
    </div>
  );
}
