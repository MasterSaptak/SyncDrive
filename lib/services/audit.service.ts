import crypto from 'crypto';
import { AuditLogEntry } from '@/types';
import { dataStore } from '@/lib/db/data-store';

export class AuditService {
  static async log(params: {
    tenantId?: string;
    userId: string;
    action: string;
    resourceType: 'file' | 'folder' | 'quota' | 'subscription' | 'share' | 'auth' | 'payment';
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogEntry> {
    const profile = dataStore.profiles.get(params.userId);
    const tenantId = params.tenantId || profile?.tenantId || 'tenant_default_123';

    const entry: AuditLogEntry = {
      id: `audit_${crypto.randomUUID()}`,
      tenantId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent || 'SyncDrive Web Client',
      timestamp: new Date().toISOString(),
    };

    dataStore.auditLogs.unshift(entry);

    // Keep last 1000 logs in memory
    if (dataStore.auditLogs.length > 1000) {
      dataStore.auditLogs = dataStore.auditLogs.slice(0, 1000);
    }

    return entry;
  }

  static async getLogs(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    return dataStore.auditLogs.filter((log) => log.userId === userId).slice(0, limit);
  }
}
