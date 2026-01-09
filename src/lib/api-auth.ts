/**
 * API Authentication and Authorization Helpers
 *
 * These helpers provide consistent authentication and authorization checks
 * across all API routes, with detailed logging for debugging production issues.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, AuthUser } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { prisma } from '@/lib/prisma'

export interface VerifyEventAccessResult {
  error: NextResponse | null
  user: AuthUser | null
  event: {
    id: string
    name: string
    organizationId: string
    organization: {
      id: string
      name: string
    } | null
  } | null
  effectiveOrgId: string | null
}

/**
 * Verify that the current user has access to a specific event.
 *
 * This function:
 * 1. Authenticates the user (via Clerk cookies or JWT token)
 * 2. Verifies the user exists in the database
 * 3. Checks if the user is an admin
 * 4. Verifies the event exists
 * 5. Checks organization membership (handles master_admin impersonation)
 *
 * @param request - The NextRequest object (for extracting JWT from headers)
 * @param eventId - The event ID to verify access for
 * @param options - Additional options (requireAdmin, logPrefix)
 */
export async function verifyEventAccess(
  request: NextRequest,
  eventId: string,
  options: {
    requireAdmin?: boolean
    logPrefix?: string
  } = {}
): Promise<VerifyEventAccessResult> {
  const { requireAdmin = true, logPrefix = '[verifyEventAccess]' } = options

  console.log(`${logPrefix} Starting access verification for event:`, eventId)

  // Step 1: Get user from auth
  const overrideUserId = getClerkUserIdFromHeader(request)
  console.log(`${logPrefix} Override userId from JWT:`, overrideUserId || 'none')

  const user = await getCurrentUser(overrideUserId)
  console.log(`${logPrefix} User result:`, user?.email || 'NULL')

  if (!user) {
    console.log(`${logPrefix} ❌ No user found - returning 401`)
    return {
      error: NextResponse.json(
        {
          error: 'Unauthorized - User not found',
          details: 'Your user account was not found in the database. Please contact support.'
        },
        { status: 401 }
      ),
      user: null,
      event: null,
      effectiveOrgId: null,
    }
  }

  console.log(`${logPrefix} User:`, user.email, '| Role:', user.role, '| OrgId:', user.organizationId)

  // Step 2: Check if admin is required
  if (requireAdmin && !isAdmin(user)) {
    console.log(`${logPrefix} ❌ User is not admin - returning 403`)
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden - Admin access required',
          details: `Your role (${user.role}) does not have admin access.`
        },
        { status: 403 }
      ),
      user: null,
      event: null,
      effectiveOrgId: null,
    }
  }

  // Step 3: Get effective organization ID (handles impersonation)
  const effectiveOrgId = await getEffectiveOrgId(user)
  console.log(`${logPrefix} Effective org ID:`, effectiveOrgId)

  // Step 4: Fetch the event with organization details
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  console.log(`${logPrefix} Event:`, event?.name || 'NOT FOUND', '| OrgId:', event?.organizationId)

  if (!event) {
    console.log(`${logPrefix} ❌ Event not found - returning 404`)
    return {
      error: NextResponse.json(
        {
          error: 'Event not found',
          details: `No event exists with ID: ${eventId}`
        },
        { status: 404 }
      ),
      user: null,
      event: null,
      effectiveOrgId: null,
    }
  }

  // Step 5: Check organization access
  // Master admin can access everything
  if (user.role === 'master_admin') {
    console.log(`${logPrefix} ✅ Master admin - access granted`)
    return { error: null, user, event, effectiveOrgId }
  }

  // For other admins, check organization match
  if (event.organizationId !== effectiveOrgId) {
    console.log(`${logPrefix} ❌ Organization mismatch!`)
    console.log(`${logPrefix}    User's org: ${effectiveOrgId} (${user.organization?.name || 'unknown'})`)
    console.log(`${logPrefix}    Event's org: ${event.organizationId} (${event.organization?.name || 'unknown'})`)
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden - Organization mismatch',
          details: `This event belongs to "${event.organization?.name || 'another organization'}" but you are a member of "${user.organization?.name || 'a different organization'}".`,
          debug: {
            userOrgId: effectiveOrgId,
            userOrgName: user.organization?.name,
            eventOrgId: event.organizationId,
            eventOrgName: event.organization?.name,
          },
        },
        { status: 403 }
      ),
      user: null,
      event: null,
      effectiveOrgId: null,
    }
  }

  console.log(`${logPrefix} ✅ Access granted for user:`, user.email)
  return { error: null, user, event, effectiveOrgId }
}

/**
 * Simpler version that just verifies the user is authenticated and is an admin.
 * Use this for routes that don't need event-specific access checks.
 */
export async function verifyAdminAccess(
  request: NextRequest,
  logPrefix: string = '[verifyAdminAccess]'
): Promise<{ error: NextResponse | null; user: AuthUser | null; effectiveOrgId: string | null }> {
  console.log(`${logPrefix} Starting admin access verification`)

  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    console.log(`${logPrefix} ❌ No user found - returning 401`)
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - User not found' },
        { status: 401 }
      ),
      user: null,
      effectiveOrgId: null,
    }
  }

  if (!isAdmin(user)) {
    console.log(`${logPrefix} ❌ User is not admin - returning 403`)
    return {
      error: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
      user: null,
      effectiveOrgId: null,
    }
  }

  const effectiveOrgId = await getEffectiveOrgId(user)
  console.log(`${logPrefix} ✅ Admin verified:`, user.email, '| Effective org:', effectiveOrgId)

  return { error: null, user, effectiveOrgId }
}
