import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { FileService } from '@/lib/services/file.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { action, fileIds, targetParentId, isStarred } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'fileIds array is required and must not be empty' }, { status: 400 });
    }

    switch (action) {
      case 'trash': {
        const affected = await FileService.bulkTrash(user.id, fileIds);
        return NextResponse.json({ success: true, action: 'trash', affected });
      }
      case 'restore': {
        const affected = await FileService.bulkRestore(user.id, fileIds);
        return NextResponse.json({ success: true, action: 'restore', affected });
      }
      case 'purge': {
        const affected = await FileService.bulkPurge(user.id, fileIds);
        return NextResponse.json({ success: true, action: 'purge', affected });
      }
      case 'move': {
        const affected = await FileService.bulkMove(user.id, fileIds, targetParentId || null);
        return NextResponse.json({ success: true, action: 'move', affected });
      }
      case 'star': {
        const starValue = isStarred !== undefined ? Boolean(isStarred) : true;
        const affected = await FileService.bulkStar(user.id, fileIds, starValue);
        return NextResponse.json({ success: true, action: 'star', affected });
      }
      case 'unstar': {
        const affected = await FileService.bulkStar(user.id, fileIds, false);
        return NextResponse.json({ success: true, action: 'unstar', affected });
      }
      default:
        return NextResponse.json(
          { error: `Unsupported bulk action: ${action}. Valid: trash, restore, purge, move, star, unstar` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
