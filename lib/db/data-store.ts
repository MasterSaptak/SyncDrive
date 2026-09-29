import {
  UserProfile,
  StoragePlan,
  LogicalQuota,
  InternalFileRecord,
  UploadReservation,
  PaymentSubmission,
  PaymentRecord,
  ShareLink,
  AuditLogEntry,
  SubscriptionRecord,
  StorageAllocation,
  StorageUsage,
  StorageProviderRecord,
  StoragePoolRecord,
  InternalStorageAccount,
  StoragePool,
  PhysicalCapacityReservation,
  ResumableUploadSession,
  ReconciliationReport,
  FileVersionRecord,
  BYTES_PER_GIB,
  BYTES_PER_TIB,
} from '@/types';

export const INITIAL_STORAGE_PLANS: StoragePlan[] = [
  {
    id: 'plan_100gb',
    slug: 'starter-100gb',
    name: '100 GB Starter',
    quotaBytes: 100 * BYTES_PER_GIB, // 107,374,182,400 bytes
    monthlyPrice: 199,
    monthlyPriceInr: 199,
    currency: 'INR',
    isActive: true,
    displayOrder: 1,
    description: 'Perfect for personal documents, essential archives, and daily sync.',
    features: [
      '100 GB Logical Quota',
      'High-Speed Resumable Uploads',
      'Secure Share Links',
      'Encrypted Storage Architecture',
      'Trash Recovery for 30 days',
    ],
    isPopular: false,
  },
  {
    id: 'plan_250gb',
    slug: 'plus-250gb',
    name: '250 GB Plus',
    quotaBytes: 250 * BYTES_PER_GIB, // 268,435,456,000 bytes
    monthlyPrice: 399,
    monthlyPriceInr: 399,
    currency: 'INR',
    isActive: true,
    displayOrder: 2,
    description: 'Great for photographers, high-resolution media, and creative projects.',
    features: [
      '250 GB Logical Quota',
      'Multi-Chunk Resumable Uploads',
      'Password Protected Sharing',
      'Priority Bandwidth Routing',
      'Trash Recovery for 60 days',
    ],
    isPopular: true,
  },
  {
    id: 'plan_500gb',
    slug: 'pro-500gb',
    name: '500 GB Pro',
    quotaBytes: 500 * BYTES_PER_GIB, // 536,870,912,000 bytes
    monthlyPrice: 699,
    monthlyPriceInr: 699,
    currency: 'INR',
    isActive: true,
    displayOrder: 3,
    description: 'Heavy workflows, large raw datasets, and comprehensive computer backups.',
    features: [
      '500 GB Logical Quota',
      'Resumable Chunk Concurrency',
      'Advanced Share Permissions',
      'Priority Storage Pool Nodes',
      'Trash Recovery for 90 days',
    ],
    isPopular: false,
  },
  {
    id: 'plan_1tb',
    slug: 'elite-1tb',
    name: '1 TB Ultimate',
    quotaBytes: 1 * BYTES_PER_TIB, // 1,099,511,627,776 bytes
    monthlyPrice: 1199,
    monthlyPriceInr: 1199,
    currency: 'INR',
    isActive: true,
    displayOrder: 4,
    description: 'Massive capacity with zero compromises for power users and enterprise archives.',
    features: [
      '1 TB Logical Quota',
      'Unlimited Resumable Bandwidth',
      'Dedicated Storage Pool Routing',
      'Cryptographic Share Tokens',
      'Extended Trash Retention',
    ],
    isPopular: false,
  },
];

export interface SystemSettings {
  warningThreshold: number;
  criticalThreshold: number;
  maxUploadSizeGB: number;
  trashRetentionDays: number;
  maintenanceMode: boolean;
  strictSharding: boolean;
  defaultUpiId: string;
}

/**
 * MemoryDataStore
 *
 * Fast in-memory state store providing multi-tenant entity management,
 * synchronized caching, and zero-setup preview capabilities.
 */
export class MemoryDataStore {
  public profiles: Map<string, UserProfile> = new Map();
  public credentials: Map<string, string> = new Map(); // email -> sha256 hash
  public userStatuses: Map<string, 'active' | 'suspended'> = new Map();
  public plans: StoragePlan[] = INITIAL_STORAGE_PLANS;
  public subscriptions: Map<string, SubscriptionRecord> = new Map();
  public storageAllocations: Map<string, StorageAllocation> = new Map();
  public storageUsage: Map<string, StorageUsage> = new Map();
  public storageProviders: Map<string, StorageProviderRecord> = new Map();
  public storagePools: Map<string, StoragePoolRecord> = new Map();
  public storageAccounts: Map<string, InternalStorageAccount> = new Map();
  public infrastructurePools: Map<string, StoragePool> = new Map();
  public physicalReservations: Map<string, PhysicalCapacityReservation> = new Map();
  public resumableSessions: Map<string, ResumableUploadSession> = new Map();
  public reconciliationReports: Map<string, ReconciliationReport> = new Map();
  public files: Map<string, InternalFileRecord> = new Map();
  public fileVersions: Map<string, FileVersionRecord> = new Map();
  public reservations: Map<string, UploadReservation> = new Map();
  public shareLinks: Map<string, ShareLink> = new Map();
  public paymentSubmissions: Map<string, PaymentSubmission> = new Map();
  public paymentRecords: Map<string, PaymentRecord> = new Map();
  public auditLogs: AuditLogEntry[] = [];
  public settings: SystemSettings = {
    warningThreshold: 80,
    criticalThreshold: 92,
    maxUploadSizeGB: 10,
    trashRetentionDays: 30,
    maintenanceMode: false,
    strictSharding: true,
    defaultUpiId: process.env.DEFAULT_UPI_ID || 'storagepay@upi',
  };

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const tenantId = 'tenant_default_123';
    const FIVE_TB = 5 * BYTES_PER_TIB; // 5 TB = 5,497,558,138,880 bytes

    // 1. Seed Customer Profiles & Admin Profiles
    const users: Array<UserProfile & { status?: 'active' | 'suspended'; usageBytes?: number; fileCount?: number }> = [
      {
        id: 'admin_master_01',
        tenantId: 'tenant_system_root',
        email: 'admin@syncdrive.io',
        fullName: 'System Administrator',
        role: 'super_admin',
        currentPlanId: 'plan_1tb',
        createdAt: '2026-01-01T00:00:00Z',
        status: 'active',
        usageBytes: 245000000,
        fileCount: 15,
      },
      {
        id: 'usr_admin_01',
        tenantId: 'tenant_system_root',
        email: 'admin@syncdrive.internal',
        fullName: 'Sarah Chen (Ops Lead)',
        role: 'admin',
        currentPlanId: 'plan_1tb',
        createdAt: '2026-06-01T09:00:00Z',
        avatarUrl: 'https://picsum.photos/seed/sarahadmin/300/300',
        status: 'active',
        usageBytes: 120400000,
        fileCount: 12,
      },
      {
        id: 'usr_customer_01',
        tenantId: 'tenant_customer_01',
        email: 'alex.morgan@example.com',
        fullName: 'Alex Morgan',
        role: 'customer',
        currentPlanId: 'plan_100gb',
        avatarUrl: 'https://picsum.photos/seed/alexmorgan/300/300',
        createdAt: '2026-08-01T12:00:00Z',
        status: 'active',
        usageBytes: Math.round(42.8 * BYTES_PER_GIB),
        fileCount: 142,
      },
      {
        id: 'usr_customer_02',
        tenantId: 'tenant_customer_02',
        email: 'elena.rostova@techvault.io',
        fullName: 'Elena Rostova',
        role: 'customer',
        currentPlanId: 'plan_500gb',
        avatarUrl: 'https://picsum.photos/seed/elenar/300/300',
        createdAt: '2026-07-14T10:30:00Z',
        status: 'active',
        usageBytes: Math.round(318.5 * BYTES_PER_GIB),
        fileCount: 890,
      },
      {
        id: 'usr_customer_03',
        tenantId: 'tenant_customer_03',
        email: 'marcus.vance@studiocreative.co',
        fullName: 'Marcus Vance',
        role: 'customer',
        currentPlanId: 'plan_1tb',
        avatarUrl: 'https://picsum.photos/seed/marcusv/300/300',
        createdAt: '2026-06-20T15:00:00Z',
        status: 'active',
        usageBytes: Math.round(812.3 * BYTES_PER_GIB),
        fileCount: 2450,
      },
      {
        id: 'usr_customer_04',
        tenantId: 'tenant_customer_04',
        email: 'chloe.dupont@designlab.fr',
        fullName: 'Chloe Dupont',
        role: 'customer',
        currentPlanId: 'plan_100gb',
        avatarUrl: 'https://picsum.photos/seed/chloed/300/300',
        createdAt: '2026-08-28T08:15:00Z',
        status: 'active',
        usageBytes: Math.round(18.2 * BYTES_PER_GIB),
        fileCount: 64,
      },
      {
        id: 'usr_customer_05',
        tenantId: 'tenant_customer_05',
        email: 'kenji.sato@tokyomedia.jp',
        fullName: 'Kenji Sato',
        role: 'customer',
        currentPlanId: 'plan_250gb',
        avatarUrl: 'https://picsum.photos/seed/kenjis/300/300',
        createdAt: '2026-05-10T11:00:00Z',
        status: 'suspended',
        usageBytes: Math.round(248.6 * BYTES_PER_GIB),
        fileCount: 198,
      },
    ];

    for (const u of users) {
      this.profiles.set(u.id, {
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        currentPlanId: u.currentPlanId,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
      });

      this.userStatuses.set(u.id, u.status || 'active');

      const plan = this.plans.find((p) => p.id === u.currentPlanId) || this.plans[0];
      const subId = `sub_${u.id}`;
      this.subscriptions.set(subId, {
        id: subId,
        tenantId: u.tenantId,
        userId: u.id,
        planId: plan.id,
        status: u.status === 'suspended' ? 'suspended' : 'active',
        storageEntitlementBytes: plan.quotaBytes,
        currentPeriodStart: u.createdAt,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: u.createdAt,
        updatedAt: new Date().toISOString(),
      });

      const allocId = `alloc_${u.id}`;
      this.storageAllocations.set(allocId, {
        id: allocId,
        tenantId: u.tenantId,
        userId: u.id,
        allocatedBytes: plan.quotaBytes,
        allocationType: 'plan_quota',
        isActive: u.status !== 'suspended',
        expiresAt: null,
        createdAt: u.createdAt,
        updatedAt: new Date().toISOString(),
      });

      this.storageUsage.set(u.id, {
        id: `usage_${u.id}`,
        tenantId: u.tenantId,
        userId: u.id,
        usedBytes: u.usageBytes || 0,
        reservedBytes: 0,
        fileCount: u.fileCount || 0,
        folderCount: 2,
        lastCalculatedAt: new Date().toISOString(),
      });
    }

    // 2. Seed 10 Google Drive Cluster Nodes (10 x 5 TB = 50 TB Fleet)
    const nodeConfigs = [
      { id: 'gdrive-node-01', name: 'Google Drive Cluster Node 01 (US-East)', email: 'drive-node-01@storage-pool.cloudvault.internal', latency: 42, usedPct: 0.58 },
      { id: 'gdrive-node-02', name: 'Google Drive Cluster Node 02 (US-East)', email: 'drive-node-02@storage-pool.cloudvault.internal', latency: 38, usedPct: 0.51 },
      { id: 'gdrive-node-03', name: 'Google Drive Cluster Node 03 (US-Central)', email: 'drive-node-03@storage-pool.cloudvault.internal', latency: 45, usedPct: 0.69 },
      { id: 'gdrive-node-04', name: 'Google Drive Cluster Node 04 (US-West)', email: 'drive-node-04@storage-pool.cloudvault.internal', latency: 29, usedPct: 0.47 },
      { id: 'gdrive-node-05', name: 'Google Drive Cluster Node 05 (EU-West)', email: 'drive-node-05@storage-pool.cloudvault.internal', latency: 68, usedPct: 0.74 },
      { id: 'gdrive-node-06', name: 'Google Drive Cluster Node 06 (EU-Central)', email: 'drive-node-06@storage-pool.cloudvault.internal', latency: 72, usedPct: 0.63 },
      { id: 'gdrive-node-07', name: 'Google Drive Cluster Node 07 (AP-South)', email: 'drive-node-07@storage-pool.cloudvault.internal', latency: 54, usedPct: 0.55 },
      { id: 'gdrive-node-08', name: 'Google Drive Cluster Node 08 (AP-Southeast)', email: 'drive-node-08@storage-pool.cloudvault.internal', latency: 62, usedPct: 0.41 },
      { id: 'gdrive-node-09', name: 'Google Drive Cluster Node 09 (AP-Northeast)', email: 'drive-node-09@storage-pool.cloudvault.internal', latency: 85, usedPct: 0.82 },
      { id: 'gdrive-node-10', name: 'Google Drive Cluster Node 10 (Cold-Archive)', email: 'drive-node-10@storage-pool.cloudvault.internal', latency: 95, usedPct: 0.33 },
    ];

    const poolAccountIds: string[] = [];
    let poolTotalBytes = 0;
    let poolUsedBytes = 0;

    for (const node of nodeConfigs) {
      const used = Math.round(FIVE_TB * node.usedPct);
      poolTotalBytes += FIVE_TB;
      poolUsedBytes += used;
      poolAccountIds.push(node.id);

      const acc: InternalStorageAccount = {
        id: node.id,
        poolId: 'pool_gdrive_primary',
        provider: 'google_drive',
        name: node.name,
        email: node.email,
        status: 'active',
        capacityTotalBytes: FIVE_TB,
        capacityUsedBytes: used,
        capacityReservedBytes: 0,
        availableBytes: FIVE_TB - used,
        encryptedCredentialRef: `kms:secret/gdrive/${node.id}`,
        credentials: {
          clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'gdrive_client_live',
          clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
          rootFolderId: `root_${node.id}`,
        },
        healthStatus: node.usedPct > 0.8 ? 'degraded' : 'healthy',
        lastHealthCheck: new Date().toISOString(),
        rootFolderId: `root_${node.id}`,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };
      this.storageAccounts.set(node.id, acc);
    }

    const unifiedPool: StoragePool = {
      id: 'pool_gdrive_primary',
      name: 'Unified Google Drive Fleet (50 TB Primary)',
      provider: 'google_drive',
      status: 'active',
      accountIds: poolAccountIds,
      capacityTotalBytes: poolTotalBytes,
      capacityUsedBytes: poolUsedBytes,
      capacityReservedBytes: 0,
      availableBytes: poolTotalBytes - poolUsedBytes,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.infrastructurePools.set(unifiedPool.id, unifiedPool);

    // 3. Seed Sample Files & Folders
    const sampleFiles: InternalFileRecord[] = [
      {
        id: 'file_welcome_guide',
        tenantId,
        userId: 'customer_123',
        parentId: null,
        name: 'Welcome_Guide.md',
        sizeBytes: 348,
        mimeType: 'text/markdown',
        checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        isFolder: false,
        isStarred: true,
        isTrash: false,
        deletedAt: null,
        storageProvider: 'google_drive',
        storageObjectId: 'gdrive_obj_001',
        storageAccountId: 'gdrive-node-01',
        uploadStatus: 'completed',
        version: 1,
        createdAt: '2026-02-01T09:00:00Z',
        updatedAt: '2026-02-01T09:00:00Z',
      },
      {
        id: 'file_contract_pdf',
        tenantId,
        userId: 'customer_123',
        parentId: null,
        name: 'Service_Agreement_2026.pdf',
        sizeBytes: 245600,
        mimeType: 'application/pdf',
        checksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        isFolder: false,
        isStarred: false,
        isTrash: false,
        deletedAt: null,
        storageProvider: 'google_drive',
        storageObjectId: 'gdrive_obj_002',
        storageAccountId: 'gdrive-node-02',
        uploadStatus: 'completed',
        version: 1,
        createdAt: '2026-02-05T11:20:00Z',
        updatedAt: '2026-02-05T11:20:00Z',
      },
      {
        id: 'file_alex_finance',
        tenantId: 'tenant_customer_01',
        userId: 'usr_customer_01',
        parentId: null,
        name: 'Q3-2026-Financial-Audit.pdf',
        sizeBytes: 4250000,
        mimeType: 'application/pdf',
        isFolder: false,
        isStarred: true,
        isTrash: false,
        deletedAt: null,
        storageProvider: 'google_drive',
        storageObjectId: 'gdrive_obj_003',
        storageAccountId: 'gdrive-node-01',
        uploadStatus: 'completed',
        version: 1,
        createdAt: '2026-08-15T10:00:00Z',
        updatedAt: '2026-08-15T10:00:00Z',
      },
      {
        id: 'file_brand_logo',
        tenantId: 'tenant_customer_01',
        userId: 'usr_customer_01',
        parentId: null,
        name: 'Brand_Identity_Pack.zip',
        sizeBytes: 154200000,
        mimeType: 'application/zip',
        isFolder: false,
        isStarred: false,
        isTrash: false,
        deletedAt: null,
        storageProvider: 'google_drive',
        storageObjectId: 'gdrive_obj_004',
        storageAccountId: 'gdrive-node-03',
        uploadStatus: 'completed',
        version: 1,
        createdAt: '2026-08-20T14:30:00Z',
        updatedAt: '2026-08-20T14:30:00Z',
      },
      {
        id: 'file_marcus_raw_footage',
        tenantId: 'tenant_customer_03',
        userId: 'usr_customer_03',
        parentId: null,
        name: 'Studio_Commercial_4K_ProRes.mov',
        sizeBytes: 8420000000,
        mimeType: 'video/quicktime',
        isFolder: false,
        isStarred: true,
        isTrash: false,
        deletedAt: null,
        storageProvider: 'google_drive',
        storageObjectId: 'gdrive_obj_005',
        storageAccountId: 'gdrive-node-04',
        uploadStatus: 'completed',
        version: 1,
        createdAt: '2026-09-01T16:00:00Z',
        updatedAt: '2026-09-01T16:00:00Z',
      },
      {
        id: 'file_elena_db_dump',
        tenantId: 'tenant_customer_02',
        userId: 'usr_customer_02',
        parentId: null,
        name: 'Database_Backup_Postgres_Prod.sql.gz',
        sizeBytes: 1850000000,
        mimeType: 'application/gzip',
        isFolder: false,
        isStarred: false,
        isTrash: false,
        deletedAt: null,
        storageProvider: 'google_drive',
        storageObjectId: 'gdrive_obj_006',
        storageAccountId: 'gdrive-node-05',
        uploadStatus: 'completed',
        version: 1,
        createdAt: '2026-09-10T08:00:00Z',
        updatedAt: '2026-09-10T08:00:00Z',
      },
    ];

    for (const f of sampleFiles) {
      this.files.set(f.id, f);
    }

    // 4. Seed UPI Payment Submissions (Awaiting and Approved)
    const samplePayments: PaymentSubmission[] = [
      {
        id: 'pay_sub_01',
        tenantId: 'tenant_customer_03',
        userId: 'usr_customer_03',
        planId: 'plan_1tb',
        planName: '1 TB Ultimate',
        amount: 1199,
        amountInr: 1199,
        currency: 'INR',
        method: 'manual_upi',
        referenceId: '829301928471',
        upiReferenceId: '829301928471',
        payerVpa: 'marcus.vance@okaxis',
        payeeVpa: this.settings.defaultUpiId,
        status: 'submitted',
        submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'pay_sub_02',
        tenantId: 'tenant_customer_02',
        userId: 'usr_customer_02',
        planId: 'plan_500gb',
        planName: '500 GB Pro',
        amount: 699,
        amountInr: 699,
        currency: 'INR',
        method: 'manual_upi',
        referenceId: '910293847561',
        upiReferenceId: '910293847561',
        payerVpa: 'elena.rostova@okhdfcbank',
        payeeVpa: this.settings.defaultUpiId,
        status: 'approved',
        adminNotes: 'Payment verified and credited via UPI fast path',
        reviewedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        submittedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: 'pay_sub_03',
        tenantId: 'tenant_customer_04',
        userId: 'usr_customer_04',
        planId: 'plan_250gb',
        planName: '250 GB Plus',
        amount: 399,
        amountInr: 399,
        currency: 'INR',
        method: 'manual_upi',
        referenceId: '729104829102',
        upiReferenceId: '729104829102',
        payerVpa: 'chloe.dupont@oksbi',
        payeeVpa: this.settings.defaultUpiId,
        status: 'submitted',
        submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ];

    for (const p of samplePayments) {
      this.paymentSubmissions.set(p.id, p);
      const recId = `rec_${p.id}`;
      this.paymentRecords.set(recId, {
        id: recId,
        tenantId: p.tenantId,
        userId: p.userId,
        planId: p.planId,
        gateway: 'manual_upi',
        gatewayTransactionId: p.referenceId,
        amount: p.amount,
        currency: p.currency,
        status: p.status === 'approved' ? 'succeeded' : 'pending',
        metadata: { submissionId: p.id, payerVpa: p.payerVpa },
        createdAt: p.submittedAt,
        updatedAt: p.reviewedAt || p.submittedAt,
      });
    }

    // 5. Seed Upload Reservations / Sessions
    const sampleReservation: UploadReservation = {
      id: 'res_active_01',
      tenantId: 'tenant_customer_01',
      userId: 'usr_customer_01',
      expectedSizeBytes: 420000000,
      storageNodeId: 'gdrive-node-01',
      expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };
    this.reservations.set(sampleReservation.id, sampleReservation);

    // 6. Seed Initial Audit Logs
    this.auditLogs.push(
      {
        id: 'audit_01',
        tenantId: 'tenant_system_root',
        userId: 'admin_master_01',
        action: 'CLUSTER_INITIALIZED',
        resourceType: 'storage' as any,
        metadata: { pool: 'pool_gdrive_primary', nodes: 10, totalCapacityTB: 50 },
        timestamp: '2026-01-01T00:01:00Z',
      },
      {
        id: 'audit_02',
        tenantId: 'tenant_customer_03',
        userId: 'usr_customer_03',
        action: 'PAYMENT_SUBMITTED_UPI',
        resourceType: 'payment',
        resourceId: 'pay_sub_01',
        metadata: { planId: 'plan_1tb', amount: 1199, referenceId: '829301928471' },
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'audit_03',
        tenantId: 'tenant_customer_02',
        userId: 'usr_customer_02',
        action: 'PAYMENT_APPROVED_QUOTA_UPGRADED',
        resourceType: 'payment',
        resourceId: 'pay_sub_02',
        metadata: { planId: 'plan_500gb', amount: 699 },
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      }
    );
  }
}

// Global singleton across serverless invokes in memory
declare global {
  var __memoryDataStore: MemoryDataStore | undefined;
}

export const dataStore = global.__memoryDataStore || new MemoryDataStore();
if (!dataStore.credentials) {
  dataStore.credentials = new Map();
}
if (process.env.NODE_ENV !== 'production') {
  global.__memoryDataStore = dataStore;
}
