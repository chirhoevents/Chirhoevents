/**
 * API Authentication and Authorization Helpers
 *
 * These helpers provide consistent authentication and authorization checks
 * across all API routes, with detailed logging for debugging production issues.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCurrentUser, isAdmin, AuthUser } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader, getClerkUserIdFromCookies } from '@/lib/jwt-auth-helper'
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

  console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
  console.log(`${logPrefix} 🔍 Starting access verification for event:`, eventId)
  console.log(`${logPrefix} Request URL:`, request.url)

  // Debug: Check what cookies we have
  const cookieHeader = request.headers.get('cookie')
  console.log(`${logPrefix} 🍪 Cookie header present:`, !!cookieHeader)
  if (cookieHeader) {
    // List cookie names (not values for security)
    const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0])
    console.log(`${logPrefix} 🍪 Cookie names:`, cookieNames.join(', '))
  }

  // Debug: Check Authorization header
  const authHeader = request.headers.get('Authorization')
  console.log(`${logPrefix} 🔑 Authorization header present:`, !!authHeader)

  // Step 1: Try to get userId directly from Clerk first
  console.log(`${logPrefix} 📡 Calling Clerk auth()...`)
  const clerkAuth = await auth()
  console.log(`${logPrefix} 📡 Clerk auth() result:`, {
    userId: clerkAuth.userId || 'NULL',
    sessionId: clerkAuth.sessionId || 'NULL',
  })

  // Step 1b: Try multiple fallbacks to get user ID
  let overrideUserId = getClerkUserIdFromHeader(request)
  console.log(`${logPrefix} 🔑 Override userId from JWT header:`, overrideUserId || 'none')

  // If Clerk auth() failed and no JWT header, try extracting from cookies directly
  // This handles the case where publishable key suffix doesn't match cookies
  if (!clerkAuth.userId && !overrideUserId) {
    console.log(`${logPrefix} 🔄 Clerk auth failed, trying cookie fallback...`)
    const cookieUserId = getClerkUserIdFromCookies(request)
    if (cookieUserId) {
      console.log(`${logPrefix} ✅ Found userId from cookie fallback:`, cookieUserId)
      overrideUserId = cookieUserId
    }
  }

  const user = await getCurrentUser(overrideUserId)
  console.log(`${logPrefix} 👤 User result:`, user?.email || 'NULL')

  if (!user) {
    console.log(`${logPrefix} ❌ No user found - returning 401`)
    console.log(`${logPrefix} ❌ This usually means:`)
    console.log(`${logPrefix}    1. Clerk cookies not being sent (check cookie domain config)`)
    console.log(`${logPrefix}    2. User not synced to database (run sync script)`)
    console.log(`${logPrefix}    3. JWT token invalid or missing`)
    console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
    return {
      error: NextResponse.json(
        {
          error: 'Unauthorized - User not found',
          details: 'Your user account was not found in the database. Please contact support.',
          debug: {
            clerkUserId: clerkAuth.userId || null,
            hasCookies: !!cookieHeader,
            hasAuthHeader: !!authHeader,
          }
        },
        { status: 401 }
      ),
      user: null,
      event: null,
      effectiveOrgId: null,
    }
  }

  console.log(`${logPrefix} 👤 User authenticated:`, {
    email: user.email,
    role: user.role,
    orgId: user.organizationId,
    orgName: user.organization?.name,
  })

  // Step 2: Check if admin is required
  if (requireAdmin && !isAdmin(user)) {
    console.log(`${logPrefix} ❌ User is not admin - returning 403`)
    console.log(`${logPrefix} ❌ Role "${user.role}" is not an admin role`)
    console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
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
  console.log(`${logPrefix} ✅ Admin check passed (role: ${user.role})`)

  // Step 3: Get effective organization ID (handles impersonation)
  const effectiveOrgId = await getEffectiveOrgId(user)
  console.log(`${logPrefix} 🏢 Effective org ID:`, effectiveOrgId)

  // Step 4: Fetch the event with organization details
  console.log(`${logPrefix} 📅 Looking up event:`, eventId)
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

  console.log(`${logPrefix} 📅 Event lookup result:`, {
    found: !!event,
    name: event?.name || 'NOT FOUND',
    orgId: event?.organizationId || 'N/A',
    orgName: event?.organization?.name || 'N/A',
  })

  if (!event) {
    console.log(`${logPrefix} ❌ Event not found - returning 404`)
    console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
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
  console.log(`${logPrefix} 🔐 Permission check:`)
  console.log(`${logPrefix}    User org:  ${effectiveOrgId} (${user.organization?.name || 'unknown'})`)
  console.log(`${logPrefix}    Event org: ${event.organizationId} (${event.organization?.name || 'unknown'})`)
  console.log(`${logPrefix}    User role: ${user.role}`)
  console.log(`${logPrefix}    Orgs match: ${effectiveOrgId === event.organizationId}`)

  // Master admin can access everything
  if (user.role === 'master_admin') {
    console.log(`${logPrefix} ✅ Master admin - access granted`)
    console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
    return { error: null, user, event, effectiveOrgId }
  }

  // For other admins, check organization match
  if (event.organizationId !== effectiveOrgId) {
    console.log(`${logPrefix} ❌ Organization mismatch - ACCESS DENIED!`)
    console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
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

  console.log(`${logPrefix} ✅ ACCESS GRANTED for user:`, user.email)
  console.log(`${logPrefix} ═══════════════════════════════════════════════════`)
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

// Import permission checking functions
import { hasPermission, type Permission, type UserRole } from '@/lib/permissions'

/**
 * Create a permission check error response
 */
function createPermissionError(
  user: AuthUser,
  permission: Permission,
  friendlyName: string,
  logPrefix: string
): NextResponse {
  console.error(`${logPrefix} ❌ User ${user.email} (role: ${user.role}) lacks ${permission} permission`)
  return NextResponse.json(
    { error: `Forbidden - ${friendlyName} access required` },
    { status: 403 }
  )
}

/**
 * Verify event access with a specific permission check.
 * Use this for routes that need both event access and a specific permission.
 */
export async function verifyEventAccessWithPermission(
  request: NextRequest,
  eventId: string,
  permission: Permission,
  options: {
    friendlyName?: string
    logPrefix?: string
  } = {}
): Promise<VerifyEventAccessResult> {
  const { friendlyName = permission, logPrefix = `[verifyEventAccess/${permission}]` } = options

  // First verify event access
  const result = await verifyEventAccess(request, eventId, { requireAdmin: true, logPrefix })
  if (result.error) return result

  // Then check the specific permission
  if (!hasPermission(result.user!.role as UserRole, permission)) {
    return {
      error: createPermissionError(result.user!, permission, friendlyName, logPrefix),
      user: null,
      event: null,
      effectiveOrgId: null,
    }
  }

  return result
}

/**
 * Verify Poros portal access (requires poros.access permission)
 */
export async function verifyPorosAccess(
  request: NextRequest,
  eventId: string,
  logPrefix: string = '[Poros]'
): Promise<VerifyEventAccessResult> {
  return verifyEventAccessWithPermission(request, eventId, 'poros.access', {
    friendlyName: 'Poros portal',
    logPrefix,
  })
}

/**
 * Verify SALVE portal access (requires salve.access permission)
 */
export async function verifySalveAccess(
  request: NextRequest,
  eventId: string,
  logPrefix: string = '[SALVE]'
): Promise<VerifyEventAccessResult> {
  return verifyEventAccessWithPermission(request, eventId, 'salve.access', {
    friendlyName: 'SALVE check-in portal',
    logPrefix,
  })
}

/**
 * Verify Rapha portal access (requires rapha.access permission)
 */
export async function verifyRaphaAccess(
  request: NextRequest,
  eventId: string,
  logPrefix: string = '[Rapha]'
): Promise<VerifyEventAccessResult> {
  return verifyEventAccessWithPermission(request, eventId, 'rapha.access', {
    friendlyName: 'Rapha medical portal',
    logPrefix,
  })
}

/**
 * Verify financial report access (requires reports.view_financial permission)
 */
export async function verifyFinancialReportAccess(
  request: NextRequest,
  eventId: string,
  logPrefix: string = '[Financial Report]'
): Promise<VerifyEventAccessResult> {
  return verifyEventAccessWithPermission(request, eventId, 'reports.view_financial', {
    friendlyName: 'Financial report',
    logPrefix,
  })
}

/**
 * Verify basic report access (requires reports.view permission)
 */
export async function verifyReportAccess(
  request: NextRequest,
  eventId: string,
  logPrefix: string = '[Report]'
): Promise<VerifyEventAccessResult> {
  return verifyEventAccessWithPermission(request, eventId, 'reports.view', {
    friendlyName: 'Reports',
    logPrefix,
  })
}

/**
 * Verify payments processing access (requires payments.process permission)
 */
export async function verifyPaymentsAccess(
  request: NextRequest,
  eventId: string,
  logPrefix: string = '[Payments]'
): Promise<VerifyEventAccessResult> {
  return verifyEventAccessWithPermission(request, eventId, 'payments.process', {
    friendlyName: 'Payment processing',
    logPrefix,
  })
}
