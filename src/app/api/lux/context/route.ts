import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { getSimpleEventUsage } from '@/lib/lux/limits'
import { ensureOrgPublicSlug } from '@/lib/lux/org-slug'
import { getTierDisplayName } from '@/lib/subscription-tiers'

/**
 * GET /api/lux/context
 * Everything the Lux dashboard layout needs: who's signed in, which org,
 * plan limits, whether payments are set up, and the parish's public page.
 */
export async function GET(request: NextRequest) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error

  const [org, usage, publicSlug] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        stripeChargesEnabled: true,
        stripeAccountId: true,
        subscriptionStatus: true,
        pauseReason: true,
        pauseReasonNote: true,
        pausedAt: true,
      },
    }),
    getSimpleEventUsage(ctx.organizationId),
    ensureOrgPublicSlug(ctx.organizationId),
  ])
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const effectiveRole = ctx.isImpersonating || ctx.user.role === 'master_admin' ? 'org_admin' : ctx.user.role

  return NextResponse.json({
    organizationId: ctx.organizationId,
    organizationName: org.name,
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor || '#1E3A5F',
    secondaryColor: org.secondaryColor || '#9C8466',
    userRole: effectiveRole,
    actualRole: ctx.user.role,
    userName: `${ctx.user.firstName} ${ctx.user.lastName}`.trim(),
    email: ctx.user.email,
    canManage: ctx.canManage,
    isImpersonating: ctx.isImpersonating,
    impersonatedOrgId: ctx.isImpersonating ? ctx.organizationId : null,
    modulesEnabled: ctx.modules,
    subscriptionTier: ctx.organization.subscriptionTier,
    tierName: getTierDisplayName(ctx.organization.subscriptionTier),
    publicSlug,
    paymentsReady: !!org.stripeAccountId && org.stripeChargesEnabled,
    simpleEvents: {
      limit: usage.limit,
      used: usage.used,
      remaining: usage.remaining,
      resetsOn: usage.periodEnd.toISOString(),
    },
    subscriptionStatus: org.subscriptionStatus,
    pauseReason: org.pauseReason,
    pauseReasonNote: org.pauseReasonNote,
    pausedAt: org.pausedAt,
  })
}
