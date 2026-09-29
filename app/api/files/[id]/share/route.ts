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
    const accessType = body.accessType === 'download' ? 'download' : 'view';
    const expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : undefined;

    const shareLink = await FileService.createShareLink(user.id, id, accessType, expiresInDays);
    return NextResponse.json({ shareLink }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
