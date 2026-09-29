import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { StorageAllocationService } from '@/lib/services/storage-allocation.service';
import { dataStore } from '@/lib/db/data-store';

/**
 * Internal Operator API: Internal Storage Accounts
 * Redacts secret credentials and OAuth tokens.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Internal storage accounts telemetry requires administrator privileges.' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const poolId = searchParams.get('poolId') || undefined;

    const accounts = await StorageAllocationService.getStorageAccounts(poolId);

    // Sanitize credentials: NEVER return client secrets, refresh tokens or private keys
    const sanitizedAccounts = accounts.map((acc) => ({
      id: acc.id,
      poolId: acc.poolId,
      provider: acc.provider,
      name: acc.name,
      email: acc.email,
      status: acc.status,
      capacityTotalBytes: acc.capacityTotalBytes,
      capacityUsedBytes: acc.capacityUsedBytes,
      capacityReservedBytes: acc.capacityReservedBytes,
      availableBytes: acc.availableBytes,
      healthStatus: acc.healthStatus,
      lastHealthCheck: acc.lastHealthCheck,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
      credentialConfigured: Boolean(
        acc.credentials?.clientId && acc.credentials?.refreshToken
      ),
    }));

    return NextResponse.json({ accounts: sanitizedAccounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
