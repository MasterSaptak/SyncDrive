import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set('syncdrive_user_id', '', { path: '/', maxAge: 0 });
    response.cookies.set('syncdrive_user_data', '', { path: '/', maxAge: 0 });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}
