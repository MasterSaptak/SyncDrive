import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { PaymentService } from '@/lib/services/payment.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const payments = await PaymentService.getUserPayments(user.id);
    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    // Check if this is a demo approval trigger
    if (body.action === 'demo_approve' && body.paymentId) {
      const approved = await PaymentService.approvePayment(body.paymentId);
      return NextResponse.json({ payment: approved, message: 'Payment approved and quota upgraded' });
    }

    const { planId, amountInr, upiReferenceId, userVpa } = body;
    if (!planId || !amountInr || !upiReferenceId) {
      return NextResponse.json(
        { error: 'planId, amountInr, and upiReferenceId are required' },
        { status: 400 }
      );
    }

    const payment = await PaymentService.submitUPIPayment({
      userId: user.id,
      planId,
      amountInr,
      upiReferenceId,
      userVpa,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
