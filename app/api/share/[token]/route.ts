import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/file.service';
import { storageManager } from '@/lib/storage/StorageManager';
import { dataStore } from '@/lib/db/data-store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const downloadParam = req.nextUrl.searchParams.get('download') === 'true';

    const { link, file } = await FileService.resolveShareLink(token);

    if (downloadParam) {
      const internalRecord = dataStore.files.get(file.id);
      if (!internalRecord || !internalRecord.storageObjectId) {
        return NextResponse.json({ error: 'File binary unavailable' }, { status: 404 });
      }

      const provider = await storageManager.getProviderForAccount(internalRecord.storageAccountId);
      const download = await provider.download(internalRecord.storageObjectId);

      return new NextResponse(download.data as any, {
        status: 200,
        headers: {
          'Content-Type': download.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
          'Content-Length': download.contentLength.toString(),
        },
      });
    }

    return NextResponse.json({
      link: {
        token: link.token,
        fileName: link.fileName,
        accessType: link.accessType,
        expiresAt: link.expiresAt,
        downloadCount: link.downloadCount,
      },
      file,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
