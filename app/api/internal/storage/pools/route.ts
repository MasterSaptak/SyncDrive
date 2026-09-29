import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { StorageAllocationService } from '@/lib/services/storage-allocation.service';

/**
 * Internal Operator API: Infrastructure Storage Pools
 * Strictly restricted to operators/admins.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    
    // Validate role permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Internal infrastructure telemetry requires administrator privileges.' },
        { status: 403 }
      );
    }

    const pools = await StorageAllocationService.getPools();
    return NextResponse.json({ pools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
