import { DeviceSession } from '@/types/session';
import { dataStore } from '@/lib/db/data-store';

const MAX_DEVICES = 2;
const HEARTBEAT_TIMEOUT_MS = 16000; // 16 seconds heartbeat validity for responsive live state

// In-memory real-time device sessions registry (keyed by userId / UID)
const userSessionsMap = new Map<string, DeviceSession[]>();

// In-memory evicted devices tracker (deviceId -> eviction timestamp)
const evictedDevicesMap = new Map<string, number>();

export interface LiveActiveUser {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  currentPath: string;
  activeAction: string;
  deviceId: string;
  deviceName: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  browser: string;
  os: string;
  ip: string;
  screenResolution?: string;
  viewport?: string;
  devicePixelRatio?: number;
  language?: string;
  timezone?: string;
  networkType?: string;
  isIdle?: boolean;
  sessionStartedAt?: string;
  connectedAt: string;
  lastHeartbeat: number;
  lastSeenAt: string;
  isOnline: boolean;
}

// Live active users registry
const liveActiveUsersMap = new Map<string, LiveActiveUser>();

export class DeviceSessionService {
  /**
   * Retrieves all currently active online users across the cluster.
   */
  static getLiveActiveUsers(): LiveActiveUser[] {
    const now = Date.now();
    const active: LiveActiveUser[] = [];
    for (const [userId, user] of liveActiveUsersMap.entries()) {
      if (now - user.lastHeartbeat <= HEARTBEAT_TIMEOUT_MS) {
        active.push({ ...user, isOnline: true });
      } else {
        liveActiveUsersMap.delete(userId);
      }
    }
    return active;
  }

  /**
   * Check if a specific user is currently active/online.
   */
  static isUserOnline(userId: string): boolean {
    const user = liveActiveUsersMap.get(userId);
    if (!user) return false;
    return Date.now() - user.lastHeartbeat <= HEARTBEAT_TIMEOUT_MS;
  }

  /**
   * Get active session detail for a specific user.
   */
  static getUserLiveSession(userId: string): LiveActiveUser | null {
    const user = liveActiveUsersMap.get(userId);
    if (!user) return null;
    if (Date.now() - user.lastHeartbeat <= HEARTBEAT_TIMEOUT_MS) {
      return { ...user, isOnline: true };
    }
    return null;
  }

  /**
   * Prune sessions that haven't sent a heartbeat within the timeout window.
   */
  private static pruneStaleSessions(userId: string): DeviceSession[] {
    const now = Date.now();
    const sessions = userSessionsMap.get(userId) || [];
    const active = sessions.filter((s) => now - s.lastHeartbeat <= HEARTBEAT_TIMEOUT_MS);
    userSessionsMap.set(userId, active);
    return active;
  }

  /**
   * Processes active heartbeat from a device connected with UID.
   */
  static heartbeat(payload: {
    userId: string;
    deviceId: string;
    deviceName: string;
    deviceType?: 'desktop' | 'tablet' | 'mobile';
    browser: string;
    os: string;
    ip?: string;
    screenResolution?: string;
    viewport?: string;
    devicePixelRatio?: number;
    language?: string;
    timezone?: string;
    networkType?: string;
    isIdle?: boolean;
    sessionStartedAt?: string;
    currentPath?: string;
    activeAction?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    avatarUrl?: string;
  }): {
    allowed: boolean;
    reason?: 'device_limit_exceeded' | 'session_evicted';
    activeSessions: DeviceSession[];
    maxAllowedDevices: number;
  } {
    const {
      userId,
      deviceId,
      deviceName,
      deviceType = 'desktop',
      browser,
      os,
      ip = '127.0.0.1',
      screenResolution,
      viewport,
      devicePixelRatio,
      language = 'en-US',
      timezone = 'UTC',
      networkType = 'wifi',
      isIdle = false,
      sessionStartedAt,
      currentPath = '/drive',
      activeAction = 'Active on Storage Portal',
      userName,
      userEmail,
      userRole,
      avatarUrl,
    } = payload;
    const now = Date.now();

    // Update real-time live active user record
    const profile = dataStore.profiles.get(userId);
    const resolvedName = userName || profile?.fullName || profile?.email?.split('@')[0] || (userId.startsWith('visitor_') || userId.startsWith('guest_') ? 'Guest Visitor' : 'SyncDrive User');
    const resolvedEmail = userEmail || profile?.email || (userId.startsWith('visitor_') || userId.startsWith('guest_') ? 'guest@syncdrive.io' : 'user@syncdrive.io');
    const resolvedRole = userRole || profile?.role || (userId.startsWith('visitor_') || userId.startsWith('guest_') ? 'guest' : 'customer');

    const existingRecord = liveActiveUsersMap.get(userId);
    const liveRecord: LiveActiveUser = {
      userId,
      fullName: resolvedName,
      email: resolvedEmail,
      avatarUrl: avatarUrl || profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(resolvedName)}`,
      role: resolvedRole,
      currentPath,
      activeAction,
      deviceId,
      deviceName,
      deviceType,
      browser,
      os,
      ip,
      screenResolution,
      viewport,
      devicePixelRatio,
      language,
      timezone,
      networkType,
      isIdle,
      sessionStartedAt: sessionStartedAt || existingRecord?.sessionStartedAt || new Date().toISOString(),
      connectedAt: existingRecord?.connectedAt || new Date().toISOString(),
      lastHeartbeat: now,
      lastSeenAt: new Date().toISOString(),
      isOnline: true,
    };
    liveActiveUsersMap.set(userId, liveRecord);

    // 1. Check if this device was recently evicted by "Use Here" on another device
    const evictedAt = evictedDevicesMap.get(deviceId);
    if (evictedAt && now - evictedAt < 120000) {
      const currentActive = this.pruneStaleSessions(userId);
      return {
        allowed: false,
        reason: 'session_evicted',
        activeSessions: currentActive,
        maxAllowedDevices: MAX_DEVICES,
      };
    }

    // 2. Prune any stale sessions for this user
    let activeSessions = this.pruneStaleSessions(userId);

    // 3. Check if current device is already among active sessions
    const existingIndex = activeSessions.findIndex((s) => s.deviceId === deviceId);

    if (existingIndex >= 0) {
      // Refresh heartbeat
      activeSessions[existingIndex].lastHeartbeat = now;
      activeSessions[existingIndex].deviceName = deviceName;
      activeSessions[existingIndex].browser = browser;
      activeSessions[existingIndex].os = os;

      return {
        allowed: true,
        activeSessions,
        maxAllowedDevices: MAX_DEVICES,
      };
    }

    // 4. Device is not yet registered. Check if under maximum device limit (2)
    if (activeSessions.length < MAX_DEVICES) {
      const newSession: DeviceSession = {
        id: `sock_${crypto.randomUUID()}`,
        userId,
        deviceId,
        deviceName,
        browser,
        os,
        ip,
        lastHeartbeat: now,
        createdAt: now,
      };

      activeSessions.push(newSession);
      userSessionsMap.set(userId, activeSessions);

      return {
        allowed: true,
        activeSessions,
        maxAllowedDevices: MAX_DEVICES,
      };
    }

    // 5. Maximum device limit (2) is reached and this device is not among the active 2
    return {
      allowed: false,
      reason: 'device_limit_exceeded',
      activeSessions,
      maxAllowedDevices: MAX_DEVICES,
    };
  }

  /**
   * "Use Here" handler: Evicts an older session to grant this device active access.
   */
  static claimSessionHere(payload: {
    userId: string;
    deviceId: string;
    deviceName: string;
    browser: string;
    os: string;
    ip?: string;
    evictDeviceId?: string;
  }): {
    allowed: boolean;
    activeSessions: DeviceSession[];
    evictedDeviceId: string;
  } {
    const { userId, deviceId, deviceName, browser, os, ip = '127.0.0.1', evictDeviceId } = payload;
    const now = Date.now();

    // Clear eviction record for this device since user explicitly chose to "Use Here"
    evictedDevicesMap.delete(deviceId);

    let activeSessions = this.pruneStaleSessions(userId);

    // Identify which session to evict:
    let toEvictIndex = -1;
    if (evictDeviceId) {
      toEvictIndex = activeSessions.findIndex((s) => s.deviceId === evictDeviceId);
    }

    // If none specified or not found, evict the oldest active session
    if (toEvictIndex === -1 && activeSessions.length >= MAX_DEVICES) {
      // Find oldest by lastHeartbeat or createdAt
      let oldestTime = Infinity;
      activeSessions.forEach((s, idx) => {
        if (s.lastHeartbeat < oldestTime) {
          oldestTime = s.lastHeartbeat;
          toEvictIndex = idx;
        }
      });
    }

    let evictedId = '';
    if (toEvictIndex >= 0) {
      const evicted = activeSessions.splice(toEvictIndex, 1)[0];
      evictedId = evicted.deviceId;
      evictedDevicesMap.set(evicted.deviceId, now);
    }

    // Add current device
    const existingIndex = activeSessions.findIndex((s) => s.deviceId === deviceId);
    if (existingIndex >= 0) {
      activeSessions[existingIndex].lastHeartbeat = now;
    } else {
      activeSessions.push({
        id: `sock_${crypto.randomUUID()}`,
        userId,
        deviceId,
        deviceName,
        browser,
        os,
        ip,
        lastHeartbeat: now,
        createdAt: now,
      });
    }

    userSessionsMap.set(userId, activeSessions);

    return {
      allowed: true,
      activeSessions,
      evictedDeviceId: evictedId,
    };
  }

  /**
   * Explicitly disconnects a device session (e.g. user logs out on that device).
   */
  static disconnectDevice(userId: string, deviceId: string): DeviceSession[] {
    let activeSessions = this.pruneStaleSessions(userId);
    activeSessions = activeSessions.filter((s) => s.deviceId !== deviceId);
    userSessionsMap.set(userId, activeSessions);
    if (activeSessions.length === 0) {
      liveActiveUsersMap.delete(userId);
    }
    return activeSessions;
  }

  /**
   * Retrieves active sessions for a user.
   */
  static getActiveSessions(userId: string): DeviceSession[] {
    return this.pruneStaleSessions(userId);
  }

  static useHere(payload: any) {
    return DeviceSessionService.claimSessionHere(payload);
  }
}
