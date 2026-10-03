import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, AlertTriangle, Lock, Server, CloudOff } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-900 rounded-3xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <div className="p-8 sm:p-12 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/register" className="inline-flex items-center text-sm font-medium text-sky-600 hover:text-sky-500 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign Up
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Terms and Conditions</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Last updated: October 2026</p>
        </div>

        <div className="p-8 sm:p-12 space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">1. Acceptance of Terms</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              By accessing and using SyncDrive, you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. 
              Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">2. User Account Responsibilities</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. 
              You agree to accept responsibility for all activities that occur under your account or password. SyncDrive reserves the right to refuse service, terminate accounts, remove or edit content, or cancel orders in its sole discretion.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">3. Acceptable and Prohibited Use</h2>
            </div>
            <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
              <li>You may not use the service for any illegal or unauthorized purpose.</li>
              <li>You must not, in the use of the service, violate any laws in your jurisdiction (including but not limited to copyright laws).</li>
              <li>Uploading malware, viruses, or any malicious code is strictly prohibited.</li>
              <li>Sharing or hosting pirated material or content that violates intellectual property rights is forbidden.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">4. Ownership of Uploaded Files</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              SyncDrive does not claim any ownership rights in the text, files, images, photos, video, sounds, musical works, works of authorship, or any other materials that you upload to the platform. 
              By displaying or publishing any content on or through SyncDrive, you hereby grant SyncDrive a limited license to use, modify, publicly perform, publicly display, reproduce, and distribute such content solely on and through the service.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Server className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">5. Storage Limits and Service Availability</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We provide a 25 GB logical storage pool on activation for trial accounts. Continued usage beyond the trial, or requiring more storage, is subject to the limitations of our paid plans. 
              While we strive for 99.9% uptime, SyncDrive is provided on an "as is" and "as available" basis without any warranty or condition, express, implied or statutory.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <CloudOff className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">6. Account Termination</h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. 
              All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity and limitations of liability.
            </p>
          </section>
          
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <p className="text-xs text-neutral-500">
              For any questions regarding these terms, please contact support@syncdrive.example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
