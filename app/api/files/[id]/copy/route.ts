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
    const body = await req.json().catch(() => ({}));
    const targetParentId = body.targetParentId !== undefined ? body.targetParentId : undefined;

    const copy = await FileService.copy(user.id, id, targetParentId);
    return NextResponse.json({ file: copy }, { status: 201 });
  } catch (err: any) {
    const status = err.name === 'QuotaExceededError' ? 402 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
