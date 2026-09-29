import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset instructions have been dispatched to your email address.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Password reset request failed' }, { status: 500 });
  }
}
