'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublicNavbar } from '@/components/navigation/PublicNavbar';
import { PublicFooter } from '@/components/navigation/PublicFooter';
import { LandingPage } from '@/components/public/LandingPage';
import { ToastContainer } from '@/components/common/ToastContainer';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/');

  // Once logged in, prevent access to the landing page and forward to drive
  useEffect(() => {
    if (authUser) {
      router.replace('/drive');
    }
  }, [authUser, router]);

  // Mount sync: handle hash redirect or initial section scroll without SSR mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').replace(/^\//, '');
      if (hash === 'login' || hash === 'register' || hash === 'forgot-password' || hash === 'drive' || hash === 'dashboard') {
        router.push(`/${hash}`);
        return;
      }
      if (hash) {
        setCurrentPath(`/${hash}`);
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [router]);

  const handleNavigate = (path: string) => {
    // If it's a dedicated page route, use Next.js router
    if (path.startsWith('/login') || path === 'login') {
      router.push('/login');
      return;
    }
    if (path.startsWith('/register') || path === 'register') {
      router.push('/register');
      return;
    }
    if (path.startsWith('/forgot-password') || path === 'forgot-password') {
      router.push('/forgot-password');
      return;
    }
    if (path.startsWith('/drive') || path.startsWith('/dashboard') || path === 'drive' || path === 'dashboard') {
      router.push('/drive');
      return;
    }

    // Otherwise, handle in-page section scrolling
    setCurrentPath(path);
    const clean = path.replace(/^#\/?/, '').replace(/^\//, '');
    const inPageSections: Record<string, string> = {
      features: 'features',
      'how-it-works': 'how-it-works',
      pricing: 'pricing',
      security: 'security',
      about: 'security',
    };

    if (inPageSections[clean]) {
      const sectionId = inPageSections[clean];
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectPlan = (_planId: string) => {
    if (!authUser) {
      router.push('/register');
    } else {
      router.push('/drive');
    }
  };

  if (authUser) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col antialiased transition-colors duration-200">
      <PublicNavbar currentPath={currentPath} onNavigate={handleNavigate} />
      <main className="flex-1">
        <LandingPage
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onSelectPlan={handleSelectPlan}
        />
      </main>
      <PublicFooter onNavigate={handleNavigate} />
    </div>
  );
}
