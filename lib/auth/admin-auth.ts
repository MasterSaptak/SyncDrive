import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from './session';
import { UserProfile } from '@/types';

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key, x-user-id, Accept',
  };
}

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function verifyAdminRequest(req: NextRequest): Promise<{
  authorized: boolean;
  user?: UserProfile;
  errorResponse?: NextResponse;
}> {
  // 1. Check for shared secret API key (used by Admin portal and backend-to-backend calls)
  const adminKey = req.headers.get('x-admin-key');
  const expectedSecret = process.env.ADMIN_API_SECRET || 'syncdrive_admin_secret_key_2026';

  if (adminKey && adminKey === expectedSecret) {
    return {
      authorized: true,
      user: {
        id: 'usr_admin_01',
        tenantId: 'tenant_system_root',
        email: 'admin@syncdrive.internal',
        fullName: 'Sarah Chen (Admin)',
        role: 'admin',
        currentPlanId: 'plan_1tb',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 2. Check for authenticated user with admin or super_admin role
  try {
    const user = await getAuthenticatedUser(req);
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      return { authorized: true, user };
    }
  } catch (err) {
    // Continue
  }

  // 3. In development mode with localhost, allow seamless pairing
  const host = req.headers.get('host') || '';
  const origin = req.headers.get('origin') || '';
  const isDev = process.env.NODE_ENV !== 'production' || host.includes('localhost') || origin.includes('localhost');
  if (isDev) {
    return {
      authorized: true,
      user: {
        id: 'usr_admin_01',
        tenantId: 'tenant_system_root',
        email: 'admin@syncdrive.internal',
        fullName: 'Sarah Chen (Admin)',
        role: 'admin',
        currentPlanId: 'plan_1tb',
        createdAt: new Date().toISOString(),
      },
    };
  }

  return {
    authorized: false,
    errorResponse: NextResponse.json(
      { error: 'Unauthorized: Administrator access required.' },
      { status: 403, headers: corsHeaders() }
    ),
  };
}
