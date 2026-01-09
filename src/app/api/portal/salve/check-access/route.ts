import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  console.log('[SALVE Portal Check-Access] Request received')
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    console.log('[SALVE Portal Check-Access] Override userId:', overrideUserId || 'none')

    const user = await getCurrentUser(overrideUserId)
    console.log('[SALVE Portal Check-Access] User:', user?.email || 'NULL')

    if (!user) {
      console.log('[SALVE Portal Check-Access] ❌ No user found')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    console.log('[SALVE Portal Check-Access] EventId:', eventId || 'none')

    // Get effective organization ID (handles impersonation for master_admin)
    const effectiveOrgId = await getEffectiveOrgId(user)
    console.log('[SALVE Portal Check-Access] User role:', user.role, '| Effective org:', effectiveOrgId)

    // Check if user has salve.access permission (covers salve_coordinator, event_manager, org_admin, master_admin)
    // Also check custom permissions for explicit salve access
    const hasSalvePermission = hasPermission(user.role, 'salve.access')
    const hasCustomSalveAccess = user.permissions?.['salve.access'] === true ||
      user.permissions?.['portals.salve.view'] === true

    console.log('[SALVE Portal Check-Access] Has salve permission:', hasSalvePermission, '| Custom access:', hasCustomSalveAccess)

    if (hasSalvePermission || hasCustomSalveAccess) {
      // If eventId is provided, verify organization access
      if (eventId) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { organizationId: true, name: true },
        })

        console.log('[SALVE Portal Check-Access] Event org:', event?.organizationId)

        // Master admin can access any event
        if (user.role !== 'master_admin' && event && event.organizationId !== effectiveOrgId) {
          console.log('[SALVE Portal Check-Access] ❌ Org mismatch')
          return NextResponse.json(
            {
              error: 'You do not have access to this event',
              details: `This event belongs to a different organization.`,
            },
            { status: 403 }
          )
        }
      }

      console.log('[SALVE Portal Check-Access] ✅ Access granted')
      return NextResponse.json({
        authorized: true,
        isAdmin: isAdmin(user),
        role: user.role,
        organizationId: effectiveOrgId,
      })
    }

    // User has no salve access
    console.log('[SALVE Portal Check-Access] ❌ No salve.access permission')
    return NextResponse.json(
      { error: 'You do not have permission to access the SALVE Check-In Portal' },
      { status: 403 }
    )
  } catch (error) {
    console.error('[SALVE Portal Check-Access] 💥 Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
