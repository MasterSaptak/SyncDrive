import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { AuditService } from '@/lib/services/audit.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const { paymentId } = await params;
  const payment = dataStore.paymentSubmissions.get(paymentId);

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404, headers: corsHeaders() });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Reference number could not be verified with receiving bank';

    payment.status = 'rejected';
    payment.adminNotes = reason;
    payment.reviewedAt = new Date().toISOString();

    for (const rec of dataStore.paymentRecords.values()) {
      if (rec.metadata?.submissionId === paymentId) {
        rec.status = 'failed';
        rec.updatedAt = new Date().toISOString();
      }
    }

    await AuditService.log({
      tenantId: payment.tenantId,
      userId: auth.user?.id || 'admin',
      action: 'PAYMENT_REJECTED',
      resourceType: 'payment',
      resourceId: payment.id,
      metadata: { reason },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment rejected',
        payment,
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
