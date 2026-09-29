import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { FileService } from '@/lib/services/file.service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await context.params;

    const restored = await FileService.restoreFromTrash(user.id, id);
    return NextResponse.json({ file: restored });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
