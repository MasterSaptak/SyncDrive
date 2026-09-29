import { NextRequest, NextResponse } from 'next/server';
import { DeviceSessionService } from '@/lib/services/device-session.service';

/**
 * Handles device session heartbeat and real-time concurrency check.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      userId,
      deviceId,
      deviceName,
      deviceType,
      browser,
      os,
      ip: clientReportedIp,
      screenResolution,
      viewport,
      devicePixelRatio,
      language,
      timezone,
      networkType,
      isIdle,
      sessionStartedAt,
      evictDeviceId,
      currentPath,
      activeAction,
      userName,
      userEmail,
      userRole,
      avatarUrl,
    } = body;

    // Resolve accurate client IP from request headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const resolvedIp = forwarded
      ? forwarded.split(',')[0].trim()
      : realIp || clientReportedIp || '127.0.0.1';

    if (!userId || !deviceId) {
      return NextResponse.json(
        { error: 'Missing userId or deviceId parameter' },
        { status: 400 }
      );
    }

    if (action === 'use_here') {
      const result = DeviceSessionService.claimSessionHere({
        userId,
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        browser: browser || 'Unknown Browser',
        os: os || 'Unknown OS',
        ip: resolvedIp,
        evictDeviceId,
      });

      return NextResponse.json({
        success: true,
        allowed: result.allowed,
        activeSessions: result.activeSessions,
        evictedDeviceId: result.evictedDeviceId,
      });
    }

    if (action === 'disconnect') {
      const activeSessions = DeviceSessionService.disconnectDevice(userId, deviceId);
      return NextResponse.json({ success: true, activeSessions });
    }

    // Default action: Heartbeat check
    const result = DeviceSessionService.heartbeat({
      userId,
      deviceId,
      deviceName: deviceName || 'Web Device',
      deviceType,
      browser: browser || 'Web Browser',
      os: os || 'Unknown OS',
      ip: resolvedIp,
      screenResolution,
      viewport,
      devicePixelRatio,
      language,
      timezone,
      networkType,
      isIdle,
      sessionStartedAt,
      currentPath,
      activeAction,
      userName,
      userEmail,
      userRole,
      avatarUrl,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Device session operation failed' },
      { status: 500 }
    );
  }
}

/**
 * Retrieves active device sessions for a given UID.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const activeSessions = DeviceSessionService.getActiveSessions(userId);
    return NextResponse.json({ activeSessions, maxDevices: 2 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch active device sessions' },
      { status: 500 }
    );
  }
}
