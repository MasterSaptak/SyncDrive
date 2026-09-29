'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { deviceSocket } from '@/lib/auth/device-socket';

export function TelemetryTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    let defaultAction = 'Browsing Storage Portal';
    if (pathname === '/drive') {
      defaultAction = 'Browsing My Files';
    } else if (pathname === '/dashboard') {
      defaultAction = 'Viewing Analytics Dashboard';
    } else if (pathname === '/login') {
      defaultAction = 'On Sign-In Page';
    } else if (pathname === '/register') {
      defaultAction = 'On Sign-Up Page';
    } else if (pathname === '/forgot-password') {
      defaultAction = 'Recovering Password';
    } else if (pathname === '/') {
      defaultAction = 'Browsing Features & Pricing';
    }

    deviceSocket.setPathAndAction(pathname, defaultAction);
  }, [pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        deviceSocket.setAction('Tab in background');
      } else if (document.visibilityState === 'visible') {
        deviceSocket.setAction('Active on portal');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
