'use client'

import { usePermissions } from '@/hooks/usePermissions'
import type { Permission } from '@/lib/permissions'
import { Loader2 } from 'lucide-react'

interface PermissionGuardProps {
  /**
   * Single permission or array of permissions to check.
   * If array, user needs ANY of the permissions (OR logic).
   * Use `requireAll` prop to require ALL permissions (AND logic).
   */
  permission: Permission | Permission[]
  /**
   * If true, user must have ALL permissions in the array.
   * Default is false (user needs ANY permission).
   */
  requireAll?: boolean
  /**
   * Content to show if user lacks permission.
   * Default is null (nothing shown).
   */
  fallback?: React.ReactNode
  /**
   * Content to show while loading.
   * Default is a loading spinner.
   */
  loading?: React.ReactNode
  /**
   * The protected content to render.
   */
  children: React.ReactNode
}

/**
 * Conditionally renders children based on user permissions.
 *
 * Usage:
 * ```tsx
 * <PermissionGuard permission="payments.process">
 *   <Button>Process Payment</Button>
 * </PermissionGuard>
 *
 * <PermissionGuard
 *   permission={['events.edit', 'events.delete']}
 *   fallback={<p>You cannot modify events</p>}
 * >
 *   <EventEditor />
 * </PermissionGuard>
 *
 * <PermissionGuard
 *   permission={['settings.edit', 'team.manage']}
 *   requireAll
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  requireAll = false,
  fallback = null,
  loading: loadingContent,
  children
}: PermissionGuardProps) {
  const { can, canAny, canAll, loading } = usePermissions()

  if (loading) {
    return (
      <>
        {loadingContent ?? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </>
    )
  }

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? canAll(permission)
      : canAny(permission)
    : can(permission)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Shows content only if user can view payments.
 */
export function PaymentGuard({
  fallback = null,
  children
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PermissionGuard permission="registrations.view_payments" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * Shows content only if user can view financial data.
 */
export function FinancialGuard({
  fallback = null,
  children
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PermissionGuard permission="reports.view_financial" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * Shows content only if user can manage team.
 */
export function TeamManageGuard({
  fallback = null,
  children
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PermissionGuard permission="team.manage" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * Shows content only if user can edit settings.
 */
export function SettingsEditGuard({
  fallback = null,
  children
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PermissionGuard permission="settings.edit" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * Shows content only for org_admin or master_admin.
 */
export function OrgAdminGuard({
  fallback = null,
  children
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { userRole, loading } = usePermissions()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (userRole !== 'org_admin' && userRole !== 'master_admin') {
    return <>{fallback}</>
  }

  return <>{children}</>
}
