import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { FileService } from '@/lib/services/file.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { internalFileId, reservationId, storageObjectId, checksumSha256 } = body;

    if (!internalFileId || !reservationId || !storageObjectId) {
      return NextResponse.json(
        { error: 'internalFileId, reservationId, and storageObjectId are required' },
        { status: 400 }
      );
    }

    const file = await FileService.completeUpload(
      user.id,
      internalFileId,
      reservationId,
      storageObjectId,
      checksumSha256
    );

    return NextResponse.json({ file });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
