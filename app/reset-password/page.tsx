'use client';

import React from 'react';
import { AuthPage } from '@/components/auth/AuthPage';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();

  return (
    <AuthPage
      mode="reset-password"
      onNavigate={(path) => router.push(path)}
      onSuccess={() => router.push('/login')}
    />
  );
}
