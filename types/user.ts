export type UserRole = "user" | "admin" | "customer";

export type UserStatus = "guest" | "trial" | "member" | "expired" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  createdAt?: string;
  lastLoginAt?: string;
  avatar?: string;
  avatarUrl?: string;
  fullName?: string;
  phone?: string;
  twoFactorEnabled?: boolean;
  storageUsedBytes?: number;
  storageQuotaBytes?: number;
  currentPlanId?: string;
  tenantId?: string;
}

export type UserProfile = User;

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
