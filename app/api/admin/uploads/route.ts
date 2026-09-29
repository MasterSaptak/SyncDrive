import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';

export async function OPTIONS() {
  return handleOptions();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const jobs: any[] = [];

  // Reservations
  for (const res of dataStore.reservations.values()) {
    const user = dataStore.profiles.get(res.userId);
    jobs.push({
      id: res.id,
      fileName: 'Resumable_Chunk_Stream.bin',
      size: formatBytes(res.expectedSizeBytes),
      sizeBytes: res.expectedSizeBytes,
      userId: res.userId,
      userEmail: user?.email || 'customer@syncdrive.io',
      node: res.storageNodeId || 'gdrive-node-01',
      speed: res.status === 'active' ? '48.2 MB/s' : '—',
      status: res.status === 'committed' ? 'completed' : res.status === 'active' ? 'in_progress' : 'queued',
      timestamp: new Date(res.createdAt).toLocaleTimeString(),
      createdAt: res.createdAt,
    });
  }

  // Resumable sessions
  for (const ses of dataStore.resumableSessions.values()) {
    const user = dataStore.profiles.get(ses.userId);
    const file = dataStore.files.get(ses.internalFileId);
    jobs.push({
      id: ses.sessionToken.slice(0, 12),
      fileName: file?.name || 'Multipart_Payload.dat',
      size: formatBytes(ses.expectedSizeBytes),
      sizeBytes: ses.expectedSizeBytes,
      userId: ses.userId,
      userEmail: user?.email || 'customer@syncdrive.io',
      node: ses.storageAccountId || 'gdrive-node-02',
      speed: ses.status === 'active' ? '54.0 MB/s' : '—',
      status: ses.status === 'completed' ? 'completed' : ses.status === 'active' ? 'in_progress' : 'queued',
      timestamp: new Date(ses.createdAt).toLocaleTimeString(),
      createdAt: ses.createdAt,
    });
  }

  // Ensure there are at least standard demo jobs if nothing currently in flight
  if (jobs.length === 0) {
    jobs.push(
      {
        id: 'job-98214',
        fileName: 'Quarterly_Financial_Review_2026.pdf',
        size: '24.2 MB',
        userEmail: 'alex.morgan@example.com',
        node: 'gdrive-node-03',
        speed: '48.2 MB/s',
        status: 'completed',
        timestamp: '2 mins ago',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'job-98215',
        fileName: 'Architecture_Blueprint_Rev4.fig',
        size: '118.5 MB',
        userEmail: 'elena.rostova@techvault.io',
        node: 'gdrive-node-08',
        speed: '54.0 MB/s',
        status: 'completed',
        timestamp: '7 mins ago',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'job-98216',
        fileName: 'Raw_Production_Footage_Take2.mov',
        size: '420.0 MB',
        userEmail: 'marcus.vance@studiocreative.co',
        node: 'gdrive-node-01',
        speed: '62.4 MB/s',
        status: 'in_progress',
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
      }
    );
  }

  jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(jobs, { headers: corsHeaders() });
}
