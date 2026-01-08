import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import {
  type UserRole,
  type Permission,
  hasPermission,
  hasAnyPermission,
  isAdminRole,
  ADMIN_ROLES
} from '@/lib/permissions'

// Re-export UserRole from permissions
export type { UserRole } from '@/lib/permissions'

export interface AuthUser {
  id: string
  clerkUserId: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  permissions?: Record<string, boolean> | null // Custom permission overrides
  organization: {
    id: string
    name: string
    type: string
  }
}

/**
 * Get the current authenticated user from Clerk and database
 * Returns null if not authenticated or user not found in database
 * @param overrideUserId - Optional: pass a clerkUserId directly (useful when cookies aren't ready)
 */
export async function getCurrentUser(overrideUserId?: string): Promise<AuthUser | null> {
  try {
    let userId = overrideUserId

    if (!userId) {
      const authResult = await auth()
      userId = authResult.userId ?? undefined
    }

    if (!userId) {
      return null
    }

    // Find user in database by Clerk ID
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    if (!user) {
      return null
    }

    // For non-master_admin users, organizationId and organization are required
    if (user.role !== 'master_admin' && (!user.organizationId || !user.organization)) {
      return null
    }

    // For master_admin without org, provide defaults that won't break queries
    const organizationId = user.organizationId ?? 'platform-admin'
    const organization = user.organization || { id: 'platform-admin', name: 'ChiRho Platform', type: 'platform' }

    return {
      id: user.id,
      clerkUserId: userId,
      organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      permissions: user.permissions as Record<string, boolean> | null,
      organization,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Require any admin role (roles with dashboard access)
 * Redirects to appropriate page if not authorized
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (!isAdminRole(user.role)) {
    // If they're a group leader, redirect to group leader portal
    if (user.role === 'group_leader') {
      redirect('/dashboard/group-leader')
    }
    // Otherwise, redirect to home
    redirect('/')
  }

  return user
}

/**
 * Require master admin role
 */
export async function requireMasterAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (user.role !== 'master_admin') {
    redirect('/dashboard/admin')
  }

  return user
}

/**
 * Require org admin or master admin role
 */
export async function requireOrgAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (user.role !== 'org_admin' && user.role !== 'master_admin') {
    redirect('/dashboard/admin')
  }

  return user
}

/**
 * Require a specific permission
 * Redirects to admin dashboard if user lacks permission
 */
export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (!isAdminRole(user.role)) {
    redirect('/')
  }

  if (!hasPermission(user.role, permission)) {
    redirect('/dashboard/admin?error=unauthorized')
  }

  return user
}

/**
 * Require any of the specified permissions
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (!isAdminRole(user.role)) {
    redirect('/')
  }

  if (!hasAnyPermission(user.role, permissions)) {
    redirect('/dashboard/admin?error=unauthorized')
  }

  return user
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false
  return user.role === role
}

/**
 * Check if user is any type of admin (has dashboard access)
 */
export function isAdmin(user: AuthUser | null): boolean {
  if (!user) return false
  return isAdminRole(user.role)
}

/**
 * Check if user is org_admin or master_admin (full access)
 */
export function isFullAdmin(user: AuthUser | null): boolean {
  if (!user) return false
  return user.role === 'org_admin' || user.role === 'master_admin'
}

/**
 * Check if user can access resources from a specific organization
 */
export function canAccessOrganization(user: AuthUser | null, organizationId: string): boolean {
  if (!user) return false
  // Master admins can access all organizations
  if (user.role === 'master_admin') return true
  // Others can only access their own organization
  return user.organizationId === organizationId
}

/**
 * Check if user has a specific permission (for use in components)
 */
export function userHasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false
  return hasPermission(user.role, permission)
}

/**
 * Check if user has any of the specified permissions
 */
export function userHasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  if (!user) return false
  return hasAnyPermission(user.role, permissions)
}
