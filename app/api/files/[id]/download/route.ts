import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { FileService } from '@/lib/services/file.service';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await context.params;
    const inline = req.nextUrl.searchParams.get('inline') === 'true';

    const { file, download } = await FileService.getFileBinary(user.id, id);

    const disposition = inline ? 'inline' : `attachment; filename="${encodeURIComponent(file.name)}"`;

    return new NextResponse(download.data as any, {
      status: 200,
      headers: {
        'Content-Type': download.mimeType || 'application/octet-stream',
        'Content-Disposition': disposition,
        'Content-Length': download.contentLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    const status = err.name === 'FileNotFoundError' ? 404 : err.name === 'UnauthorizedAccessError' ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
