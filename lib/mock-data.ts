import { User } from "../types/user";
import { StoragePlan } from "../types/plan";
import { CloudFile } from "../types/file";
import { Payment, ActivityEvent } from "../types/payment";
import { Subscription } from "../types/subscription";

export const GB = 1024 * 1024 * 1024;

export const INITIAL_PLANS: StoragePlan[] = [
  {
    id: "plan-trial",
    name: "Free Trial",
    storageGB: 25,
    price: 0,
    billingPeriod: "free",
    highlightText: "Instant Activation",
    features: [
      "25 GB fast cloud storage",
      "Full file manager access",
      "Instant secure sharing links",
      "Standard encryption",
      "Multi-device sync",
      "30 days validity"
    ]
  },
  {
    id: "plan-100gb",
    name: "100 GB",
    storageGB: 100,
    price: 149,
    billingPeriod: "monthly",
    features: [
      "100 GB logical storage pool",
      "High-speed uploads & downloads",
      "Shared links with permissions",
      "File revision history (30 days)",
      "Priority bandwidth",
      "Email support"
    ]
  },
  {
    id: "plan-200gb",
    name: "200 GB",
    storageGB: 200,
    price: 249,
    billingPeriod: "monthly",
    features: [
      "200 GB logical storage pool",
      "Advanced file previews",
      "Password-protected share links",
      "60-day version history",
      "Multi-file bulk downloads",
      "Priority customer support"
    ]
  },
  {
    id: "plan-500gb",
    name: "500 GB",
    storageGB: 500,
    price: 499,
    billingPeriod: "monthly",
    popular: true,
    highlightText: "Most Popular",
    features: [
      "500 GB logical storage pool",
      "Ultra-fast parallel uploads",
      "Unlimited sharing bandwidth",
      "90-day version history",
      "Custom expiration dates on shares",
      "24/7 dedicated support"
    ]
  },
  {
    id: "plan-1tb",
    name: "1 TB",
    storageGB: 1000,
    price: 899,
    billingPeriod: "monthly",
    features: [
      "1,000 GB (1 TB) enterprise pool",
      "Zero file size limit",
      "Audit logs & access reports",
      "180-day version history",
      "Advanced file recovery",
      "Dedicated account manager"
    ]
  },
  {
    id: "plan-2tb",
    name: "2 TB",
    storageGB: 2000,
    price: 1599,
    billingPeriod: "monthly",
    features: [
      "2,000 GB (2 TB) power pool",
      "Collaborative team folders",
      "Full file encryption at rest",
      "365-day version history",
      "Priority sync engine",
      "Executive concierge support"
    ]
  },
  {
    id: "plan-5tb",
    name: "5 TB",
    storageGB: 5000,
    price: 3499,
    billingPeriod: "monthly",
    features: [
      "5,000 GB (5 TB) maximum pool",
      "Enterprise bandwidth allocation",
      "Custom storage lifecycle policies",
      "Unlimited file versions",
      "SLA 99.9% uptime guarantee",
      "Dedicated infrastructure engineer"
    ]
  }
];

export const MOCK_USERS: User[] = [
  {
    id: "usr_001",
    name: "Rajat Kumar",
    email: "user@example.com",
    role: "user",
    status: "member",
    joinedAt: "2026-09-18T00:00:00.000Z",
    lastLoginAt: "2026-09-18T06:15:00.000Z",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    phone: "+91 98765 43210",
    twoFactorEnabled: true
  },
  {
    id: "usr_002",
    name: "Demo User",
    email: "demo@example.com",
    role: "user",
    status: "trial",
    joinedAt: "2026-09-17T11:20:00.000Z",
    lastLoginAt: "2026-09-18T04:30:00.000Z",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    phone: "+91 98111 22334",
    twoFactorEnabled: false
  },
  {
    id: "adm_001",
    name: "System Administrator",
    email: "admin@syncdrive.internal",
    role: "admin",
    status: "member",
    joinedAt: "2026-01-01T00:00:00.000Z",
    lastLoginAt: "2026-09-18T06:30:00.000Z",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    phone: "+91 99000 88000",
    twoFactorEnabled: true
  },
  {
    id: "usr_003",
    name: "Ananya Sharma",
    email: "ananya.s@techcorp.in",
    role: "user",
    status: "trial",
    joinedAt: "2026-09-15T09:40:00.000Z",
    lastLoginAt: "2026-09-17T18:00:00.000Z",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    phone: "+91 98450 12345"
  },
  {
    id: "usr_004",
    name: "Vikram Malhotra",
    email: "vikram@malhotra-studio.com",
    role: "user",
    status: "expired",
    joinedAt: "2026-07-10T14:20:00.000Z",
    lastLoginAt: "2026-09-16T12:00:00.000Z",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    phone: "+91 98201 54321"
  },
  {
    id: "usr_005",
    name: "Priya Patel",
    email: "priya.designs@gmail.com",
    role: "user",
    status: "member",
    joinedAt: "2026-05-04T10:15:00.000Z",
    lastLoginAt: "2026-09-18T05:55:00.000Z",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    phone: "+91 97123 45678"
  },
  {
    id: "usr_006",
    name: "Arjun Das",
    email: "arjun.das@cloudnet.org",
    role: "user",
    status: "suspended",
    joinedAt: "2026-08-01T16:45:00.000Z",
    lastLoginAt: "2026-09-10T08:10:00.000Z",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "usr_007",
    name: "Devendra Rao",
    email: "d.rao@fintechnode.com",
    role: "user",
    status: "member",
    joinedAt: "2026-08-23T11:00:00.000Z",
    lastLoginAt: "2026-09-18T02:10:00.000Z",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
  }
];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub_001",
    userId: "usr_001",
    planId: "plan-500gb",
    status: "active",
    startedAt: "2026-09-18T00:00:00.000Z",
    renewalAt: "2026-10-18T00:00:00.000Z",
    billingCycle: "monthly",
    autoRenew: true
  },
  {
    id: "sub_002",
    userId: "usr_002",
    planId: "plan-trial",
    status: "trial",
    startedAt: "2026-09-17T11:20:00.000Z",
    expiresAt: "2026-10-17T11:20:00.000Z",
    billingCycle: "monthly",
    autoRenew: false
  },
  {
    id: "sub_003",
    userId: "usr_003",
    planId: "plan-trial",
    status: "trial",
    startedAt: "2026-09-15T09:40:00.000Z",
    expiresAt: "2026-10-15T09:40:00.000Z"
  },
  {
    id: "sub_004",
    userId: "usr_004",
    planId: "plan-200gb",
    status: "expired",
    startedAt: "2026-07-10T14:20:00.000Z",
    renewalAt: "2026-09-16T14:20:00.000Z",
    expiresAt: "2026-09-16T14:20:00.000Z"
  },
  {
    id: "sub_005",
    userId: "usr_005",
    planId: "plan-1tb",
    status: "active",
    startedAt: "2026-05-04T10:15:00.000Z",
    renewalAt: "2026-10-04T10:15:00.000Z"
  },
  {
    id: "sub_006",
    userId: "usr_006",
    planId: "plan-100gb",
    status: "cancelled",
    startedAt: "2026-08-01T16:45:00.000Z",
    expiresAt: "2026-09-01T16:45:00.000Z"
  },
  {
    id: "sub_007",
    userId: "usr_007",
    planId: "plan-500gb",
    status: "active",
    startedAt: "2026-08-23T11:00:00.000Z",
    renewalAt: "2026-09-23T11:00:00.000Z" // 5 days from 18 Sep 2026!
  }
];

export const INITIAL_FILES: CloudFile[] = [
  // Root folders
  {
    id: "fld_college",
    name: "College",
    type: "folder",
    size: 0,
    parentId: null,
    createdAt: "2026-09-18T05:00:00.000Z",
    updatedAt: "2026-09-18T05:30:00.000Z",
    isFolder: true
  },
  {
    id: "fld_work",
    name: "Projects & Work",
    type: "folder",
    size: 0,
    parentId: null,
    createdAt: "2026-09-17T10:00:00.000Z",
    updatedAt: "2026-09-18T04:15:00.000Z",
    isFolder: true
  },
  {
    id: "fld_personal",
    name: "Personal Media",
    type: "folder",
    size: 0,
    parentId: null,
    createdAt: "2026-09-16T14:20:00.000Z",
    updatedAt: "2026-09-17T09:00:00.000Z",
    isFolder: true
  },
  // Subfolders inside College
  {
    id: "fld_assignments",
    name: "Assignments",
    type: "folder",
    size: 0,
    parentId: "fld_college",
    createdAt: "2026-09-18T05:10:00.000Z",
    updatedAt: "2026-09-18T05:40:00.000Z",
    isFolder: true
  },
  {
    id: "fld_dbms",
    name: "DBMS",
    type: "folder",
    size: 0,
    parentId: "fld_assignments",
    createdAt: "2026-09-18T05:15:00.000Z",
    updatedAt: "2026-09-18T06:10:00.000Z",
    isFolder: true
  },
  // Files inside DBMS
  {
    id: "fil_dbms_notes",
    name: "Database_Normalization_Notes.pdf",
    type: "application/pdf",
    size: 14 * 1024 * 1024, // 14 MB
    parentId: "fld_dbms",
    createdAt: "2026-09-18T05:25:00.000Z",
    updatedAt: "2026-09-18T05:25:00.000Z",
    isFolder: false,
    starred: true,
    sharedWith: [
      { email: "studygroup@college.edu", permission: "viewer" }
    ]
  },
  {
    id: "fil_schema_diagram",
    name: "E-Commerce_ERD_Schema.png",
    type: "image/png",
    size: 3.8 * 1024 * 1024,
    parentId: "fld_dbms",
    createdAt: "2026-09-18T05:35:00.000Z",
    updatedAt: "2026-09-18T05:35:00.000Z",
    isFolder: false,
    previewUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80"
  },
  // Root files
  {
    id: "fil_project_pdf",
    name: "project.pdf",
    type: "application/pdf",
    size: 52 * GB, // Representing substantial allocation
    parentId: null,
    createdAt: "2026-09-18T06:35:00.000Z", // 2 mins ago
    updatedAt: "2026-09-18T06:35:00.000Z",
    isFolder: false,
    starred: true,
    sharedWith: [
      { email: "collaborator@partner.org", permission: "editor" }
    ]
  },
  {
    id: "fil_annual_video",
    name: "Keynote_Presentation_2026.mp4",
    type: "video/mp4",
    size: 91 * GB,
    parentId: null,
    createdAt: "2026-09-17T18:00:00.000Z",
    updatedAt: "2026-09-17T18:00:00.000Z",
    isFolder: false,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-tech-abstract-loop-42867-large.mp4"
  },
  {
    id: "fil_brand_assets",
    name: "Brand_Asset_Library_HighRes.zip",
    type: "application/zip",
    size: 48 * GB,
    parentId: null,
    createdAt: "2026-09-16T12:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
    isFolder: false
  },
  {
    id: "fil_app_suite",
    name: "Enterprise_Tooling_Bundle.dmg",
    type: "application/x-apple-diskimage",
    size: 31 * GB,
    parentId: null,
    createdAt: "2026-09-15T09:00:00.000Z",
    updatedAt: "2026-09-15T09:00:00.000Z",
    isFolder: false
  },
  {
    id: "fil_backup_archive",
    name: "Database_Backup_Snapshots.tar.gz",
    type: "application/gzip",
    size: 23 * GB,
    parentId: null,
    createdAt: "2026-09-14T22:30:00.000Z",
    updatedAt: "2026-09-14T22:30:00.000Z",
    isFolder: false
  }
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: "pay_982103",
    userId: "usr_001",
    userName: "Rajat Kumar",
    userEmail: "user@example.com",
    planId: "plan-500gb",
    planName: "500 GB Storage Plan",
    amount: 499,
    currency: "INR",
    status: "paid",
    createdAt: "2026-09-18T00:00:00.000Z",
    paymentMethod: "UPI QR",
    transactionRef: "UPI/260918001294/CVL"
  },
  {
    id: "pay_982102",
    userId: "usr_005",
    userName: "Priya Patel",
    userEmail: "priya.designs@gmail.com",
    planId: "plan-1tb",
    planName: "1 TB Storage Plan",
    amount: 899,
    currency: "INR",
    status: "paid",
    createdAt: "2026-09-04T10:15:00.000Z",
    paymentMethod: "Credit Card",
    transactionRef: "CC/260904101582/CVL"
  },
  {
    id: "pay_982101",
    userId: "usr_007",
    userName: "Devendra Rao",
    userEmail: "d.rao@fintechnode.com",
    planId: "plan-500gb",
    planName: "500 GB Storage Plan",
    amount: 499,
    currency: "INR",
    status: "paid",
    createdAt: "2026-08-23T11:00:00.000Z",
    paymentMethod: "UPI QR",
    transactionRef: "UPI/260823110041/CVL"
  },
  {
    id: "pay_982100",
    userId: "usr_004",
    userName: "Vikram Malhotra",
    userEmail: "vikram@malhotra-studio.com",
    planId: "plan-200gb",
    planName: "200 GB Storage Plan",
    amount: 249,
    currency: "INR",
    status: "failed",
    createdAt: "2026-09-16T14:19:00.000Z",
    paymentMethod: "Net Banking",
    transactionRef: "NB/260916141901/CVL"
  },
  {
    id: "pay_982099",
    userId: "usr_004",
    userName: "Vikram Malhotra",
    userEmail: "vikram@malhotra-studio.com",
    planId: "plan-200gb",
    planName: "200 GB Storage Plan",
    amount: 249,
    currency: "INR",
    status: "paid",
    createdAt: "2026-08-10T14:20:00.000Z",
    paymentMethod: "UPI QR",
    transactionRef: "UPI/260810142012/CVL"
  }
];

export const MOCK_ACTIVITIES: ActivityEvent[] = [
  {
    id: "act_101",
    userId: "usr_001",
    userName: "Rajat Kumar",
    type: "upload",
    description: "You uploaded project.pdf (52 GB)",
    timestamp: "2026-09-18T06:35:00.000Z"
  },
  {
    id: "act_102",
    userId: "usr_001",
    userName: "Rajat Kumar",
    type: "folder_create",
    description: 'You created "College Documents"',
    timestamp: "2026-09-18T05:37:00.000Z"
  },
  {
    id: "act_103",
    userId: "usr_001",
    userName: "Rajat Kumar",
    type: "subscription_activated",
    description: "Your subscription was activated (500 GB Plan)",
    timestamp: "2026-09-17T18:30:00.000Z"
  },
  {
    id: "act_104",
    userId: "usr_001",
    userName: "Rajat Kumar",
    type: "payment",
    description: "Payment of ₹499 verified via UPI QR",
    timestamp: "2026-09-17T18:28:00.000Z"
  },
  {
    id: "act_105",
    userId: "usr_001",
    userName: "Rajat Kumar",
    type: "share",
    description: 'Shared Database_Normalization_Notes.pdf with studygroup@college.edu',
    timestamp: "2026-09-17T14:10:00.000Z"
  }
];

export const ADMIN_AUDIT_LOGS = [
  {
    id: "aud_01",
    adminName: "System Administrator",
    action: "Account Suspended",
    target: "arjun.das@cloudnet.org",
    detail: "Account suspended due to policy investigation",
    timestamp: "2026-09-18T06:12:00.000Z"
  },
  {
    id: "aud_02",
    adminName: "System Administrator",
    action: "Storage Pool Allocation Adjusted",
    target: "Global Cluster APAC-1",
    detail: "Added 20 TB virtual capacity to logical storage pool",
    timestamp: "2026-09-17T20:00:00.000Z"
  },
  {
    id: "aud_03",
    adminName: "System Administrator",
    action: "Subscription Extended",
    target: "d.rao@fintechnode.com",
    detail: "Applied 5-day grace period for pending bank renewal",
    timestamp: "2026-09-16T15:45:00.000Z"
  },
  {
    id: "aud_04",
    adminName: "Automated System",
    action: "Subscription Expired",
    target: "vikram@malhotra-studio.com",
    detail: "Subscription marked as expired after 48h payment timeout",
    timestamp: "2026-09-16T14:25:00.000Z"
  }
];
