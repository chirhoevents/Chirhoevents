/**
 * Role-Based Access Control (RBAC) System
 *
 * This file defines all roles and their associated permissions.
 * Use the helper functions to check permissions throughout the app.
 */

export type UserRole =
  | 'master_admin'
  | 'org_admin'
  | 'event_manager'
  | 'finance_manager'
  | 'poros_coordinator'
  | 'salve_coordinator'
  | 'rapha_coordinator'
  | 'staff'
  | 'group_leader'
  | 'individual'
  | 'parent'
  | 'salve_user'
  | 'rapha_user'

export type Permission =
  // Events
  | 'events.view'
  | 'events.create'
  | 'events.edit'
  | 'events.delete'
  // Registrations
  | 'registrations.view'
  | 'registrations.view_payments'
  | 'registrations.edit'
  | 'registrations.delete'
  // Payments
  | 'payments.view'
  | 'payments.process'
  | 'payments.refund'
  | 'payments.late_fees'
  // Reports
  | 'reports.view'
  | 'reports.view_basic'
  | 'reports.view_financial'
  | 'reports.export'
  // Portals
  | 'poros.access'
  | 'salve.access'
  | 'rapha.access'
  | 'portals.poros.view'
  | 'portals.salve.view'
  | 'portals.rapha.view'
  // Settings
  | 'settings.view'
  | 'settings.edit'
  | 'team.manage'
  // Forms
  | 'forms.view'
  | 'forms.edit'

// Admin roles that have access to the admin dashboard
export const ADMIN_ROLES: UserRole[] = [
  'master_admin',
  'org_admin',
  'event_manager',
  'finance_manager',
  'poros_coordinator',
  'salve_coordinator',
  'rapha_coordinator',
  'staff'
]

// Define what each role can do
const rolePermissions: Record<UserRole, Permission[]> = {
  master_admin: [
    // All permissions
    'events.view', 'events.create', 'events.edit', 'events.delete',
    'registrations.view', 'registrations.view_payments', 'registrations.edit', 'registrations.delete',
    'payments.view', 'payments.process', 'payments.refund', 'payments.late_fees',
    'reports.view', 'reports.view_basic', 'reports.view_financial', 'reports.export',
    'poros.access', 'salve.access', 'rapha.access',
    'portals.poros.view', 'portals.salve.view', 'portals.rapha.view',
    'settings.view', 'settings.edit', 'team.manage',
    'forms.view', 'forms.edit'
  ],

  org_admin: [
    // All permissions
    'events.view', 'events.create', 'events.edit', 'events.delete',
    'registrations.view', 'registrations.view_payments', 'registrations.edit', 'registrations.delete',
    'payments.view', 'payments.process', 'payments.refund', 'payments.late_fees',
    'reports.view', 'reports.view_basic', 'reports.view_financial', 'reports.export',
    'poros.access', 'salve.access', 'rapha.access',
    'portals.poros.view', 'portals.salve.view', 'portals.rapha.view',
    'settings.view', 'settings.edit', 'team.manage',
    'forms.view', 'forms.edit'
  ],

  event_manager: [
    'events.view', 'events.create', 'events.edit', // cannot delete
    'registrations.view', 'registrations.edit', // cannot view payments
    'reports.view', 'reports.view_basic', // cannot view financial
    'poros.access', 'salve.access', // can access housing & check-in
    'portals.poros.view', 'portals.salve.view', // can view portals
    'forms.view', // can view forms
    'settings.view' // can view settings but not edit
  ],

  finance_manager: [
    'events.view', // can view events
    'registrations.view', 'registrations.view_payments', // view with payments
    'payments.view', 'payments.process', 'payments.refund', 'payments.late_fees',
    'reports.view', 'reports.view_basic', 'reports.view_financial', 'reports.export',
    'settings.view' // can view settings but not edit
  ],

  poros_coordinator: [
    'events.view', // can view events
    'registrations.view', // view names only
    'poros.access', // full Poros access
    'portals.poros.view', // can view Poros portal
    'reports.view', 'reports.view_basic', // can view housing reports
    'settings.view'
  ],

  salve_coordinator: [
    'events.view', // can view events
    'registrations.view', // view names only
    'salve.access', // full SALVE access
    'portals.salve.view', // can view SALVE portal
    'reports.view', 'reports.view_basic',
    'settings.view'
  ],

  rapha_coordinator: [
    'events.view', // can view events
    'registrations.view', // view names only
    'rapha.access', // full Rapha access
    'portals.rapha.view', // can view Rapha portal
    'reports.view', 'reports.view_basic', // medical reports
    'forms.view', // need to see medical info from forms
    'settings.view'
  ],

  staff: [
    'events.view', // read-only
    'registrations.view', // names only, no payments
    'reports.view', 'reports.view_basic', // basic reports only
    'settings.view'
  ],

  // Non-admin roles - minimal permissions
  group_leader: [],
  individual: [],
  parent: [],
  salve_user: ['salve.access'],
  rapha_user: ['rapha.access']
}

/**
 * Check if user has a specific permission
 * @param userRole - The user's role
 * @param permission - The permission to check
 * @param customPermissions - Optional custom permission overrides
 */
export function hasPermission(userRole: UserRole, permission: Permission, customPermissions?: Permission[]): boolean {
  // Check custom permissions first if provided
  if (customPermissions && customPermissions.includes(permission)) {
    return true
  }
  // Fall back to role-based permissions
  return rolePermissions[userRole]?.includes(permission) || false
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(userRole, p))
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(userRole, p))
}

/**
 * Check if user can view payment amounts
 */
export function canViewPayments(userRole: UserRole): boolean {
  return hasPermission(userRole, 'registrations.view_payments')
}

/**
 * Check if user can access financial data
 */
export function canViewFinancial(userRole: UserRole): boolean {
  return hasPermission(userRole, 'reports.view_financial')
}

/**
 * Check if user is an admin (has access to admin dashboard)
 */
export function isAdminRole(userRole: UserRole): boolean {
  return ADMIN_ROLES.includes(userRole)
}

/**
 * Check if user can manage team members
 */
export function canManageTeam(userRole: UserRole): boolean {
  return hasPermission(userRole, 'team.manage')
}

/**
 * Check if user can edit settings (including Stripe)
 */
export function canEditSettings(userRole: UserRole): boolean {
  return hasPermission(userRole, 'settings.edit')
}

/**
 * Get user-friendly role name
 */
export function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    master_admin: 'Master Admin',
    org_admin: 'Organization Admin',
    event_manager: 'Event Manager',
    finance_manager: 'Finance Manager',
    poros_coordinator: 'Poros Coordinator',
    salve_coordinator: 'SALVE Coordinator',
    rapha_coordinator: 'Rapha Coordinator',
    staff: 'Staff / Viewer',
    group_leader: 'Group Leader',
    individual: 'Individual',
    parent: 'Parent',
    salve_user: 'SALVE User',
    rapha_user: 'Rapha User'
  }
  return names[role] || role
}

/**
 * Get role description for display
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    master_admin: 'Full access to all features across all organizations',
    org_admin: 'Full access to all features for this organization',
    event_manager: 'Create and manage events, assign housing, check-in',
    finance_manager: 'Handle payments, refunds, and financial reports',
    poros_coordinator: 'Manage housing assignments only',
    salve_coordinator: 'Manage event check-in only',
    rapha_coordinator: 'Access medical information and incident reports',
    staff: 'View-only access to basic information',
    group_leader: 'Manage their group registration',
    individual: 'View their own registration',
    parent: 'View their children registrations',
    salve_user: 'Check-in portal access only',
    rapha_user: 'Medical portal access only'
  }
  return descriptions[role] || ''
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || []
}

/**
 * Get roles that are assignable by org admins (excludes master_admin)
 */
export function getAssignableRoles(): UserRole[] {
  return [
    'org_admin',
    'event_manager',
    'finance_manager',
    'poros_coordinator',
    'salve_coordinator',
    'rapha_coordinator',
    'staff'
  ]
}
