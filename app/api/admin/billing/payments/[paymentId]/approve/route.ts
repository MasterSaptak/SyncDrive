import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { PaymentService } from '@/lib/services/payment.service';

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

  try {
    const payment = await PaymentService.approvePayment(paymentId);
    return NextResponse.json(
      {
        success: true,
        message: 'Payment approved successfully. Quota and plan upgraded on user account.',
        payment,
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders() });
  }
}
