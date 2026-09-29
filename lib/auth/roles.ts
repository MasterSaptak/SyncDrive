import { UserRole, UserProfile } from '@/types';

/**
 * Role Hierarchy Definition:
 * customer: Standard SaaS tenant user with file and quota operations.
 * admin: Operations staff capable of checking storage pools, system audit logs, and reviewing payments.
 * super_admin: Full platform access (plan editing, system credentials, role escalation).
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  customer: 10,
  admin: 50,
  super_admin: 100,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, 'admin');
}

export function isSuperAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, 'super_admin');
}

export function canManageStoragePools(userRole: UserRole): boolean {
  return hasRole(userRole, 'admin');
}

export function canReviewPayments(userRole: UserRole): boolean {
  return hasRole(userRole, 'admin');
}

export function canConfigurePlans(userRole: UserRole): boolean {
  return hasRole(userRole, 'super_admin');
}

/**
 * Validates tenant boundary:
 * A customer can only access their own tenantId.
 * Admins/super_admins can inspect cross-tenant records if explicitly permitted.
 */
export function canAccessTenant(user: UserProfile, targetTenantId: string): boolean {
  if (user.tenantId === targetTenantId) {
    return true;
  }
  return isAdmin(user.role);
}
