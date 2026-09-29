import { DeviceSession, DeviceSessionState } from '@/types/session';

const DEVICE_STORAGE_KEY = 'syncdrive_device_id';
const DEVICE_NAME_KEY = 'syncdrive_device_custom_name';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  try {
    let id = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!id) {
      id = `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      localStorage.setItem(DEVICE_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'fallback_device_id';
  }
}

export interface RichDeviceMetadata {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  browser: string;
  os: string;
  screenResolution: string;
  viewport: string;
  devicePixelRatio: number;
  language: string;
  timezone: string;
  networkType: string;
}

export function getDeviceMetadata(): RichDeviceMetadata {
  const deviceId = getDeviceId();
  if (typeof window === 'undefined') {
    return {
      deviceId,
      deviceName: 'Web Client',
      deviceType: 'desktop',
      browser: 'Browser',
      os: 'Unknown OS',
      screenResolution: '1920x1080',
      viewport: '1920x1080',
      devicePixelRatio: 1,
      language: 'en-US',
      timezone: 'UTC',
      networkType: 'ethernet',
    };
  }

  const userAgent = navigator.userAgent;

  // OS Detection
  let os = 'Unknown OS';
  if (userAgent.indexOf('Win') !== -1) {
    if (userAgent.indexOf('Windows NT 10.0') !== -1) os = 'Windows 11 / 10';
    else os = 'Windows PC';
  } else if (userAgent.indexOf('Mac') !== -1) {
    if (userAgent.indexOf('iPhone') !== -1) os = 'iOS (iPhone)';
    else if (userAgent.indexOf('iPad') !== -1) os = 'iPadOS';
    else os = 'macOS';
  } else if (userAgent.indexOf('Android') !== -1) {
    os = 'Android';
  } else if (userAgent.indexOf('Linux') !== -1) {
    os = 'Linux';
  }

  // Browser Detection
  let browser = 'Browser';
  if (userAgent.indexOf('Edg') !== -1) browser = 'Microsoft Edge';
  else if (userAgent.indexOf('Chrome') !== -1) browser = 'Google Chrome';
  else if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) browser = 'Apple Safari';
  else if (userAgent.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
  else if (userAgent.indexOf('Opera') !== -1 || userAgent.indexOf('OPR') !== -1) browser = 'Opera';

  // Device Type Detection
  let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  const width = window.innerWidth;
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width <= 640) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/i.test(userAgent) || (width > 640 && width <= 1024)) {
    deviceType = 'tablet';
  }

  const customName = localStorage.getItem(DEVICE_NAME_KEY);
  const deviceName = customName || `${os} • ${browser}`;
  const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const language = navigator.language || 'en-US';

  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {}

  let networkType = 'wifi';
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn) {
    networkType = conn.effectiveType || conn.type || 'wifi';
  }

  return {
    deviceId,
    deviceName,
    deviceType,
    browser,
    os,
    screenResolution,
    viewport,
    devicePixelRatio,
    language,
    timezone,
    networkType,
  };
}

export class DeviceSocketClient {
  private static instance: DeviceSocketClient | null = null;
  private timer: any = null;
  private idleCheckTimer: any = null;
  private currentUserId: string | null = null;
  private isGuest: boolean = false;
  private listeners = new Set<(state: DeviceSessionState) => void>();
  private broadcastChannel: BroadcastChannel | null = null;

  private currentAction: string = 'Browsing Storage Portal';
  private currentPath: string = '/drive';
  private sessionStartedAt: string = new Date().toISOString();
  private lastActivityTimestamp: number = Date.now();
  private isIdleState: boolean = false;

  private state: DeviceSessionState = {
    isChecking: true,
    isAllowed: true,
    reason: null,
    activeSessions: [],
    currentDeviceId: getDeviceId(),
    maxDevices: 2,
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      this.currentPath = window.location.pathname;

      if ('BroadcastChannel' in window) {
        try {
          this.broadcastChannel = new BroadcastChannel('syncdrive_device_socket_sync');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'STATE_UPDATE') {
              this.updateState(event.data.state, false);
            } else if (event.data?.type === 'SESSION_EVICTED') {
              this.updateState(
                {
                  ...this.state,
                  isAllowed: false,
                  reason: 'session_evicted',
                },
                false
              );
            }
          };
        } catch (e) {
          // Fallback if broadcast channel is unavailable
        }
      }

      // Activity tracking: Listen for mouse, key, touch, scroll to detect active vs idle
      this.setupActivityListeners();

      // On window close/unload, send synchronous beacon to disconnect immediately
      window.addEventListener('beforeunload', () => {
        this.sendDisconnectBeacon();
      });
    }
  }

  static getInstance(): DeviceSocketClient {
    if (!DeviceSocketClient.instance) {
      DeviceSocketClient.instance = new DeviceSocketClient();
    }
    return DeviceSocketClient.instance;
  }

  private setupActivityListeners() {
    if (typeof window === 'undefined') return;

    let throttleTimer: any = null;
    const onUserInteraction = () => {
      this.lastActivityTimestamp = Date.now();
      if (this.isIdleState) {
        this.isIdleState = false;
        // User came back from idle: send immediate heartbeat
        this.sendHeartbeat();
      }

      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1500);
      }
    };

    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, onUserInteraction, { passive: true });
    });

    // Check every 10 seconds for idle state (> 45s of inactivity)
    this.idleCheckTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTimestamp;
      if (idleTime > 45000 && !this.isIdleState) {
        this.isIdleState = true;
        this.sendHeartbeat();
      }
    }, 10000);
  }

  private sendDisconnectBeacon() {
    if (!this.currentUserId) return;
    try {
      const meta = getDeviceMetadata();
      const payload = JSON.stringify({
        action: 'disconnect',
        userId: this.currentUserId,
        deviceId: meta.deviceId,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/auth/device-session', blob);
      } else {
        fetch('/api/auth/device-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }

  private updateState(newState: Partial<DeviceSessionState>, broadcast = true) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((fn) => fn(this.state));

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STATE_UPDATE',
          state: this.state,
        });
      } catch {}
    }
  }

  subscribe(listener: (state: DeviceSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): DeviceSessionState {
    return this.state;
  }

  setAction(action: string) {
    if (this.currentAction === action) return;
    this.currentAction = action;
    this.lastActivityTimestamp = Date.now();
    this.isIdleState = false;
    if (this.currentUserId) {
      this.sendHeartbeat();
    }
  }

  setPathAndAction(path: string, action?: string) {
    this.currentPath = path;
    if (action) {
      this.currentAction = action;
    }
    this.lastActivityTimestamp = Date.now();
    this.isIdleState = false;
    if (this.currentUserId) {
      this.sendHeartbeat();
    }
  }

  startSessionMonitoring(userId: string) {
    if (this.currentUserId === userId && this.timer) return;
    this.stopSessionMonitoring();
    this.currentUserId = userId;
    this.isGuest = false;
    this.sessionStartedAt = new Date().toISOString();
    this.lastActivityTimestamp = Date.now();
    this.isIdleState = false;

    // Immediate heartbeat
    this.sendHeartbeat();

    // Heartbeat every 3 seconds for tight real-time telemetry stream
    this.timer = setInterval(() => {
      this.sendHeartbeat();
    }, 3000);
  }

  startGuestMonitoring() {
    if (this.currentUserId && !this.isGuest) return;
    const deviceId = getDeviceId();
    const guestId = `guest_${deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
    if (this.currentUserId === guestId && this.timer) return;

    this.stopSessionMonitoring();
    this.currentUserId = guestId;
    this.isGuest = true;
    this.sessionStartedAt = new Date().toISOString();
    this.lastActivityTimestamp = Date.now();
    this.currentAction = 'Browsing Public Site';

    this.sendHeartbeat();

    this.timer = setInterval(() => {
      this.sendHeartbeat();
    }, 3500);
  }

  stopSessionMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.currentUserId = null;
  }

  async sendHeartbeat(): Promise<void> {
    if (!this.currentUserId) return;
    const meta = getDeviceMetadata();

    let userName: string | undefined;
    let userEmail: string | undefined;
    let userRole: string | undefined;
    let avatarUrl: string | undefined;

    if (this.isGuest) {
      userName = 'Guest Visitor';
      userEmail = 'guest@syncdrive.io';
      userRole = 'guest';
    } else if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('syncdrive_auth_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          userName = parsed?.user?.fullName || parsed?.user?.name;
          userEmail = parsed?.user?.email;
          userRole = parsed?.user?.role;
          avatarUrl = parsed?.user?.avatarUrl;
        }
      } catch {}
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : this.currentPath;

    try {
      const res = await fetch('/api/auth/device-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          userId: this.currentUserId,
          currentPath,
          activeAction: this.isIdleState ? `${this.currentAction} (idle)` : this.currentAction,
          isIdle: this.isIdleState,
          sessionStartedAt: this.sessionStartedAt,
          userName,
          userEmail,
          userRole,
          avatarUrl,
          ...meta,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();

      this.updateState({
        isChecking: false,
        isAllowed: data.allowed,
        reason: data.reason || null,
        activeSessions: (data.activeSessions || []).map((s: DeviceSession) => ({
          ...s,
          isCurrent: s.deviceId === meta.deviceId,
        })),
        currentDeviceId: meta.deviceId,
        maxDevices: data.maxAllowedDevices || 2,
      });
    } catch (err) {
      console.warn('Device socket heartbeat check error:', err);
    }
  }

  async useHere(evictDeviceId?: string): Promise<boolean> {
    if (!this.currentUserId) return false;
    const meta = getDeviceMetadata();

    this.updateState({ isChecking: true });

    try {
      const res = await fetch('/api/auth/device-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'use_here',
          userId: this.currentUserId,
          ...meta,
          evictDeviceId,
        }),
      });

      if (!res.ok) {
        this.updateState({ isChecking: false });
        return false;
      }

      const data = await res.json();

      this.updateState({
        isChecking: false,
        isAllowed: true,
        reason: null,
        activeSessions: (data.activeSessions || []).map((s: DeviceSession) => ({
          ...s,
          isCurrent: s.deviceId === meta.deviceId,
        })),
        currentDeviceId: meta.deviceId,
      });

      if (this.broadcastChannel && data.evictedDeviceId) {
        try {
          this.broadcastChannel.postMessage({
            type: 'DEVICE_EVICTED_ID',
            evictedDeviceId: data.evictedDeviceId,
          });
        } catch {}
      }

      return true;
    } catch (err) {
      this.updateState({ isChecking: false });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.currentUserId) return;
    const meta = getDeviceMetadata();

    try {
      await fetch('/api/auth/device-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          userId: this.currentUserId,
          deviceId: meta.deviceId,
        }),
      });
    } catch {}

    this.stopSessionMonitoring();
  }
}

export const deviceSocket = DeviceSocketClient.getInstance();
