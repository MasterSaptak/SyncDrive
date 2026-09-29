import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';

export async function OPTIONS() {
  return handleOptions();
}

function determineCategory(mimeType: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(ext)) return 'audio';
  if (mimeType.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (mimeType.includes('presentation') || ['ppt', 'pptx', 'key'].includes(ext)) return 'presentation';
  if (mimeType.includes('document') || ['doc', 'docx', 'rtf'].includes(ext)) return 'document';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'archive';
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'go', 'rs', 'sql'].includes(ext)) return 'code';
  if (mimeType.startsWith('text/') || ext === 'txt') return 'text';
  return 'unknown';
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const searchParams = req.nextUrl.searchParams;
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const isTrash = searchParams.get('isTrash') === 'true';
  const categoryFilter = searchParams.get('category');
  const userIdFilter = searchParams.get('userId');

  const files: any[] = [];

  for (const f of dataStore.files.values()) {
    if (f.isFolder) continue; // list files only
    if (isTrash && !f.isTrash) continue;
    if (!isTrash && f.isTrash) continue;
    if (userIdFilter && f.userId !== userIdFilter) continue;

    if (search && !f.name.toLowerCase().includes(search)) continue;

    const category = determineCategory(f.mimeType, f.name);
    if (categoryFilter && categoryFilter !== 'all' && category !== categoryFilter) continue;

    const userProfile = dataStore.profiles.get(f.userId);

    files.push({
      id: f.id,
      name: f.name,
      size: f.sizeBytes,
      mimeType: f.mimeType,
      category,
      folderId: f.parentId,
      userId: f.userId,
      userEmail: userProfile?.email || 'user@syncdrive.io',
      userName: userProfile?.fullName || 'User',
      driveAccountId: f.storageAccountId || 'gdrive-node-01',
      storageProvider: f.storageProvider,
      isStarred: Boolean(f.isStarred),
      isTrash: Boolean(f.isTrash),
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    });
  }

  // Sort newest first
  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(files, { headers: corsHeaders() });
}
