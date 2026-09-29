import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { StorageReconciliationService } from '@/lib/storage/reconciliation/StorageReconciliationService';

/**
 * Internal Operator API: Storage Reconciliation Foundation
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Reconciliation reports require administrator role.' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId') || undefined;

    const reports = await StorageReconciliationService.getReports(accountId);
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Initiating reconciliation requires administrator role.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { storageAccountId, dryRun } = body;

    if (!storageAccountId) {
      return NextResponse.json({ error: 'storageAccountId is required' }, { status: 400 });
    }

    const report = await StorageReconciliationService.reconcileStorageAccount(storageAccountId, {
      dryRun: dryRun !== false,
    });

    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
