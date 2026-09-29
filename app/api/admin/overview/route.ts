import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, corsHeaders, handleOptions } from '@/lib/auth/admin-auth';
import { dataStore } from '@/lib/db/data-store';
import { StorageAllocationService } from '@/lib/services/storage-allocation.service';
import { DeviceSessionService } from '@/lib/services/device-session.service';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.errorResponse!;

  const liveUsers = DeviceSessionService.getLiveActiveUsers();
  const usersList = Array.from(dataStore.profiles.values());
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => (dataStore.userStatuses.get(u.id) || 'active') === 'active').length;

  const subsList = Array.from(dataStore.subscriptions.values());
  const activeSubs = subsList.filter((s) => s.status === 'active').length;

  let totalAllocated = 0;
  for (const a of dataStore.storageAllocations.values()) {
    if (a.isActive) totalAllocated += a.allocatedBytes;
  }

  let totalUsed = 0;
  for (const u of dataStore.storageUsage.values()) {
    totalUsed += u.usedBytes;
  }

  const accounts = Array.from(dataStore.storageAccounts.values());
  let poolCapacity = 0;
  let poolUsed = 0;
  let onlineCount = 0;

  for (const acc of accounts) {
    poolCapacity += acc.capacityTotalBytes;
    poolUsed += acc.capacityUsedBytes;
    if (acc.status === 'active') onlineCount++;
  }

  const poolAvailable = Math.max(0, poolCapacity - poolUsed);

  // Breakdown by subscription tier
  const tiersBreakdown: Record<string, number> = {
    '100gb': 0,
    '250gb': 0,
    '500gb': 0,
    '1tb': 0,
  };

  for (const s of subsList) {
    if (s.planId.includes('100gb')) tiersBreakdown['100gb']++;
    else if (s.planId.includes('250gb')) tiersBreakdown['250gb']++;
    else if (s.planId.includes('500gb')) tiersBreakdown['500gb']++;
    else if (s.planId.includes('1tb')) tiersBreakdown['1tb']++;
  }

  const poolOverview = {
    totalAccountsCount: accounts.length,
    activeAccountsCount: onlineCount,
    totalPoolCapacityBytes: poolCapacity,
    totalAllocatedBytes: totalAllocated,
    totalUsedBytes: poolUsed,
    totalReservedBytes: 0,
    totalAvailableBytes: poolAvailable,
    poolUtilizationPct: Math.round((poolUsed / (poolCapacity || 1)) * 100),
    healthyAccountsCount: accounts.filter((a) => a.healthStatus === 'healthy').length,
    degradedAccountsCount: accounts.filter((a) => a.healthStatus === 'degraded').length,
    errorAccountsCount: accounts.filter((a) => a.healthStatus === 'unhealthy').length,
    lastRebalanceTimestamp: new Date().toISOString(),
  };

  const responseData = {
    totalUsers,
    activeUsers,
    onlineUsersCount: liveUsers.length,
    onlineUsers: liveUsers,
    activeSubscriptions: activeSubs,
    totalPoolCapacityBytes: poolCapacity,
    totalAllocatedStorageBytes: totalAllocated,
    totalUsedStorageBytes: poolUsed,
    totalStorageUsedBytes: poolUsed,
    availablePoolCapacityBytes: poolAvailable,
    driveAccountsCount: accounts.length,
    driveAccountsOnline: onlineCount,
    failedUploadsCount: 0,
    uploadFailures24h: 0,
    systemHealthScore: 99.98,
    poolOverview,
    subscriptionTiersBreakdown: tiersBreakdown,
  };

  return NextResponse.json(responseData, { headers: corsHeaders() });
}
