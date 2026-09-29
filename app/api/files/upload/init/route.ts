import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { FileService } from '@/lib/services/file.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { filename, sizeBytes, mimeType, parentId } = body;

    if (!filename || typeof sizeBytes !== 'number') {
      return NextResponse.json(
        { error: 'Invalid upload request: filename and sizeBytes are required' },
        { status: 400 }
      );
    }

    const sessionData = await FileService.initUpload(
      user.id,
      parentId || null,
      filename,
      sizeBytes,
      mimeType || 'application/octet-stream'
    );

    return NextResponse.json(sessionData, { status: 201 });
  } catch (err: any) {
    const status = err.name === 'QuotaExceededError' ? 402 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
