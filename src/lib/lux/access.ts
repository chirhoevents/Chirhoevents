import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, type AuthUser } from '@/lib/auth-utils'
import { getEffectiveOrgId, isImpersonating as hasImpersonationCookie } from '@/lib/get-effective-org'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { resolveModuleAccess, type ModuleAccess } from '@/lib/subscription-tiers'
import { isLuxStaffRole } from '@/lib/lux/routing'

export interface LuxStaffContext {
  user: AuthUser
  organizationId: string
  organization: {
    id: string
    name: string
    subscriptionTier: string
    modulesEnabled: unknown
    luxSettings: unknown
    publicSlug: string | null
  }
  modules: ModuleAccess
  // org_admin / event_manager / finance_manager (and master admins) can
  // change things; the view-only "staff" role can see everything but not edit
  canManage: boolean
  isImpersonating: boolean
}

type Result = { error: NextResponse; ctx?: undefined } | { error: null; ctx: LuxStaffContext }

function deny(message: string, status: number): Result {
  return { error: NextResponse.json({ error: message }, { status }) }
}

/**
 * Checks that the request comes from a logged-in staff member of an org that
 * has Lux, and returns who they are and which org they're working in (master
 * admins work in the org they're impersonating).
 *
 * Everyone on the parish team with dashboard access can see all Lux data,
 * including families' documents. Event-volunteer roles can't.
 */
export async function requireLuxStaff(
  request: NextRequest,
  options: { manage?: boolean } = {}
): Promise<Result> {
  const clerkUserId = await getClerkUserIdFromRequest(request)
  if (!clerkUserId) return deny('Unauthorized', 401)

  const user = await getCurrentUser(clerkUserId)
  if (!user) return deny('Unauthorized', 401)

  const isMasterAdmin = user.role === 'master_admin'
  if (!isMasterAdmin && !isLuxStaffRole(user.role)) {
    return deny("Your role doesn't include Lux. Ask your organization admin.", 403)
  }

  const organizationId = await getEffectiveOrgId(user)
  // Same rule as the Events dashboard: the master admin entered this org from
  // master admin, even if it's their own org
  const isImpersonating = isMasterAdmin && await hasImpersonationCookie(user)
  if (isMasterAdmin && organizationId === 'platform-admin') {
    return deny('Open an organization from the master admin dashboard first.', 403)
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      subscriptionTier: true,
      modulesEnabled: true,
      luxSettings: true,
      publicSlug: true,
    },
  })
  if (!organization) return deny('Organization not found', 404)

  const modules = resolveModuleAccess(organization.modulesEnabled, organization.subscriptionTier)
  if (!modules.lux) {
    return deny("Lux isn't turned on for your organization. Contact ChiRho Events support to add it.", 403)
  }

  const canManage = isMasterAdmin || user.role !== 'staff'
  if (options.manage && !canManage) {
    return deny('Your role can view Lux but not make changes. Ask your organization admin.', 403)
  }

  return {
    error: null,
    ctx: { user, organizationId, organization, modules, canManage, isImpersonating },
  }
}

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Record a sensitive action (document opened, status changed, fee decision...) */
export async function luxAudit(entry: {
  organizationId?: string | null
  actorUserId?: string | null
  actorHouseholdId?: string | null
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
}): Promise<void> {
  try {
    await prisma.luxAuditLog.create({
      data: {
        organizationId: entry.organizationId ?? null,
        actorUserId: entry.actorUserId ?? null,
        actorHouseholdId: entry.actorHouseholdId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? undefined) as any,
        ip: entry.ip ?? null,
      },
    })
  } catch (error) {
    console.error('[luxAudit] Failed to record', entry.action, error)
  }
}
