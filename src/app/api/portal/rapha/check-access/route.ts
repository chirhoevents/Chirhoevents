import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { hasPermission } from '@/lib/permissions'
import { resolveModuleAccess } from '@/lib/subscription-tiers'

export async function GET(request: NextRequest) {
  console.log('[Rapha Portal Check-Access] Request received')
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    console.log('[Rapha Portal Check-Access] Override userId:', overrideUserId || 'none')

    const user = await getCurrentUser(overrideUserId)
    console.log('[Rapha Portal Check-Access] User:', user?.email || 'NULL')

    if (!user) {
      console.log('[Rapha Portal Check-Access] ❌ No user found')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    console.log('[Rapha Portal Check-Access] EventId:', eventId || 'none')

    // Get effective organization ID (handles impersonation for master_admin)
    const effectiveOrgId = await getEffectiveOrgId(user)
    console.log('[Rapha Portal Check-Access] User role:', user.role, '| Effective org:', effectiveOrgId)

    // Check if user has rapha.access permission (covers rapha_coordinator, event_manager, org_admin, master_admin)
    // Also check custom permissions for explicit rapha access
    const hasRaphaPermission = hasPermission(user.role, 'rapha.access')
    const hasCustomRaphaAccess = user.permissions?.['rapha.access'] === true ||
      user.permissions?.['portals.rapha.view'] === true

    console.log('[Rapha Portal Check-Access] Has rapha permission:', hasRaphaPermission, '| Custom access:', hasCustomRaphaAccess)

    if (hasRaphaPermission || hasCustomRaphaAccess) {
      // Fix #M9: Verify the org's resolved module access grants Rapha. Master admins
      // bypass this check so support can still access the portal during impersonation.
      if (user.role !== 'master_admin' && effectiveOrgId) {
        const org = await prisma.organization.findUnique({
          where: { id: effectiveOrgId },
          select: { subscriptionTier: true, modulesEnabled: true },
        })
        if (org) {
          const modules = resolveModuleAccess(org.modulesEnabled, org.subscriptionTier)
          if (!modules.rapha) {
            console.log('[Rapha Portal Check-Access] ❌ Org tier does not include Rapha')
            return NextResponse.json(
              { error: 'Your organization does not have access to the Rapha Medical module.' },
              { status: 403 }
            )
          }
        }
      }

      // If eventId is provided, verify organization access
      if (eventId) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { organizationId: true, name: true },
        })

        console.log('[Rapha Portal Check-Access] Event org:', event?.organizationId)

        // Master admin can access any event
        if (user.role !== 'master_admin' && event && event.organizationId !== effectiveOrgId) {
          console.log('[Rapha Portal Check-Access] ❌ Org mismatch')
          return NextResponse.json(
            {
              error: 'You do not have access to this event',
              details: `This event belongs to a different organization.`,
            },
            { status: 403 }
          )
        }
      }

      console.log('[Rapha Portal Check-Access] ✅ Access granted')
      return NextResponse.json({
        authorized: true,
        isAdmin: isAdmin(user),
        role: user.role,
        organizationId: effectiveOrgId,
      })
    }

    // User has no rapha access
    console.log('[Rapha Portal Check-Access] ❌ No rapha.access permission')
    return NextResponse.json(
      { error: 'You do not have permission to access the Rapha Medical Portal' },
      { status: 403 }
    )
  } catch (error) {
    console.error('[Rapha Portal Check-Access] 💥 Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
