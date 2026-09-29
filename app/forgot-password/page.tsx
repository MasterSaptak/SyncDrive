'use client';

import React from 'react';
import { AuthPage } from '@/components/auth/AuthPage';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <AuthPage
      mode="forgot-password"
      onNavigate={(path) => router.push(path)}
      onSuccess={() => router.push('/login')}
    />
  );
}
