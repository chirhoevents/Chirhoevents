import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export type UserRole = 'master_admin' | 'org_admin' | 'group_leader' | 'individual' | 'parent' | 'salve_user' | 'rapha_user'

export interface AuthUser {
  id: string
  clerkUserId: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organization: {
    id: string
    name: string
    type: string
  }
}

/**
 * Get the current authenticated user from Clerk and database
 * Returns null if not authenticated or user not found in database
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId } = auth()

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

    return {
      id: user.id,
      clerkUserId: userId,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      organization: user.organization,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Require admin role (org_admin or master_admin)
 * Redirects to appropriate page if not authorized
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (user.role !== 'org_admin' && user.role !== 'master_admin') {
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
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false
  return user.role === role
}

/**
 * Check if user is any type of admin
 */
export function isAdmin(user: AuthUser | null): boolean {
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
