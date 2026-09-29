import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage/StorageManager';

/**
 * Handles binary chunk upload for resumable sessions.
 */
export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionToken = searchParams.get('sessionToken');
    const startByteStr = searchParams.get('startByte');
    const totalBytesStr = searchParams.get('totalBytes');

    if (!sessionToken || !startByteStr || !totalBytesStr) {
      return NextResponse.json(
        { error: 'Missing sessionToken, startByte, or totalBytes query params' },
        { status: 400 }
      );
    }

    const startByte = parseInt(startByteStr, 10);
    const totalBytes = parseInt(totalBytesStr, 10);

    const arrayBuffer = await req.arrayBuffer();
    const chunk = new Uint8Array(arrayBuffer);

    const provider = await storageManager.getProviderForSession(sessionToken);
    const result = await provider.uploadChunk({
      sessionToken,
      chunk,
      startByte,
      totalBytes,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Chunk upload failed' },
      { status: err.statusCode || 500 }
    );
  }
}

/**
 * Queries the current upload progress / resume offset for an interrupted resumable upload.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionToken = searchParams.get('sessionToken');
    const totalBytesStr = searchParams.get('totalBytes');

    if (!sessionToken || !totalBytesStr) {
      return NextResponse.json(
        { error: 'Missing sessionToken or totalBytes query params' },
        { status: 400 }
      );
    }

    const totalBytes = parseInt(totalBytesStr, 10);
    const provider = await storageManager.getProviderForSession(sessionToken);
    
    if ('getResumeOffset' in provider && typeof (provider as any).getResumeOffset === 'function') {
      const progress = await (provider as any).getResumeOffset(sessionToken, totalBytes);
      return NextResponse.json(progress);
    }

    return NextResponse.json({ bytesReceived: 0, isComplete: false });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to check resume offset' },
      { status: err.statusCode || 500 }
    );
  }
}

/**
 * Aborts an active upload session.
 */
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing sessionToken parameter' }, { status: 400 });
    }

    const provider = await storageManager.getProviderForSession(sessionToken);
    await provider.abortUpload(sessionToken);

    return NextResponse.json({ success: true, message: 'Upload session cancelled' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to abort upload session' },
      { status: err.statusCode || 500 }
    );
  }
}
