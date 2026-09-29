'use client';

import React from 'react';
import { AuthPage } from '@/components/auth/AuthPage';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthPage
      mode="user-login"
      onNavigate={(path) => router.push(path)}
      onSuccess={() => router.push('/drive')}
    />
  );
}
