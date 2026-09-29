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

    const file = await FileService.getFile(user.id, id);
    return NextResponse.json({ file });
  } catch (err: any) {
    const status = err.name === 'FileNotFoundError' ? 404 : err.name === 'UnauthorizedAccessError' ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await context.params;
    const body = await req.json();

    // 1. Rename operation
    if (typeof body.name === 'string') {
      const renamed = await FileService.rename(user.id, id, body.name);
      return NextResponse.json({ file: renamed });
    }

    // 2. Move operation
    if (body.parentId !== undefined) {
      const moved = await FileService.move(user.id, id, body.parentId);
      return NextResponse.json({ file: moved });
    }

    // 3. Star / Unstar operation
    if (body.isStarred !== undefined) {
      const starred = await FileService.setStarred(user.id, id, Boolean(body.isStarred));
      return NextResponse.json({ file: starred });
    }

    return NextResponse.json({ error: 'No valid patch operation provided' }, { status: 400 });
  } catch (err: any) {
    const status = err.name === 'FileNotFoundError' ? 404 : err.name === 'UnauthorizedAccessError' ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await context.params;
    const purge = req.nextUrl.searchParams.get('purge') === 'true';

    if (purge) {
      await FileService.permanentDelete(user.id, id);
      return NextResponse.json({ success: true, purged: true });
    } else {
      const trashed = await FileService.moveToTrash(user.id, id);
      return NextResponse.json({ success: true, file: trashed });
    }
  } catch (err: any) {
    const status = err.name === 'FileNotFoundError' ? 404 : err.name === 'UnauthorizedAccessError' ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
