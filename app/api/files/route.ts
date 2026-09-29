import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { FileService } from '@/lib/services/file.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const searchParams = req.nextUrl.searchParams;
    const parentId = searchParams.get('parentId') || null;
    const isTrash = searchParams.get('isTrash') === 'true';
    const viewParam = searchParams.get('view') as any;
    const search = searchParams.get('search') || undefined;
    const mimeType = searchParams.get('mimeType') || undefined;
    const minSize = searchParams.get('minSize') ? Number(searchParams.get('minSize')) : undefined;
    const maxSize = searchParams.get('maxSize') ? Number(searchParams.get('maxSize')) : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const sortBy = searchParams.get('sortBy') as any;
    const sortOrder = searchParams.get('sortOrder') as any;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined;

    const files = await FileService.listFiles(user.id, parentId, {
      isTrash,
      view: viewParam,
      search,
      mimeType,
      minSize,
      maxSize,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    // Compute breadcrumbs if navigating within folder hierarchy
    let breadcrumbs: Array<{ id: string; name: string }> = [];
    if (parentId && (!viewParam || viewParam === 'files')) {
      breadcrumbs = await FileService.getBreadcrumbPath(user.id, parentId);
    }

    return NextResponse.json({
      files,
      breadcrumbs,
      count: files.length,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const contentType = req.headers.get('content-type') || '';

    // Folder Creation
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { name, parentId } = body;
      if (!name) {
        return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
      }

      const folder = await FileService.createFolder(user.id, parentId || null, name);
      return NextResponse.json({ folder }, { status: 201 });
    }

    // Direct File Upload via multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const parentId = (formData.get('parentId') as string) || null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const uploaded = await FileService.uploadDirect(
        user.id,
        parentId,
        file.name,
        buffer,
        file.type || 'application/octet-stream'
      );

      return NextResponse.json({ file: uploaded }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (err: any) {
    const status = err.name === 'QuotaExceededError' ? 402 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
