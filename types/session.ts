export interface DeviceSession {
  id: string; // socket session ID
  userId: string; // UID
  deviceId: string; // Unique client device identifier
  deviceName: string; // e.g. "Windows PC • Chrome"
  browser: string;
  os: string;
  ip: string;
  lastHeartbeat: number; // timestamp in ms
  createdAt: number;
  isCurrent?: boolean;
}

export interface DeviceSessionState {
  isChecking: boolean;
  isAllowed: boolean;
  reason?: 'device_limit_exceeded' | 'session_evicted' | null;
  activeSessions: DeviceSession[];
  currentDeviceId: string;
  maxDevices: number;
}
