import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

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

    // Check if user is an admin - they have access but still need org check for specific events
    if (isAdmin(user)) {
      // If eventId is provided, verify organization access
      if (eventId) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { organizationId: true, name: true },
        })

        console.log('[SALVE Portal Check-Access] Event org:', event?.organizationId)

        // Master admin can access any event
        if (user.role !== 'master_admin' && event && event.organizationId !== effectiveOrgId) {
          console.log('[SALVE Portal Check-Access] ❌ Org mismatch for admin')
          return NextResponse.json(
            {
              error: 'You do not have access to this event',
              details: `This event belongs to a different organization.`,
            },
            { status: 403 }
          )
        }
      }

      console.log('[SALVE Portal Check-Access] ✅ Admin access granted')
      return NextResponse.json({
        authorized: true,
        isAdmin: true,
        role: user.role,
        organizationId: effectiveOrgId,
      })
    }

    // Check if user has portal-specific roles (salve_user, salve_coordinator)
    // These roles would be stored in the user's permissions object
    const portalRoles = ['salve_user', 'salve_coordinator', 'portals.salve.view']
    const hasPortalRole = user.permissions
      ? portalRoles.some(role => user.permissions?.[role] === true)
      : false

    console.log('[SALVE Portal Check-Access] Has portal role:', hasPortalRole)

    if (hasPortalRole) {
      // If eventId is provided, verify user has access to that specific event
      if (eventId) {
        // Check if the event belongs to the user's organization
        const event = await prisma.event.findFirst({
          where: {
            id: eventId,
            organizationId: effectiveOrgId,
          },
        })

        if (!event) {
          console.log('[SALVE Portal Check-Access] ❌ Event not found or org mismatch for portal user')
          return NextResponse.json(
            { error: 'You do not have access to this event' },
            { status: 403 }
          )
        }
      }

      console.log('[SALVE Portal Check-Access] ✅ Portal role access granted')
      return NextResponse.json({
        authorized: true,
        isAdmin: false,
        role: hasPortalRole ? 'salve_user' : user.role,
        organizationId: effectiveOrgId,
      })
    }

    // User has no admin access and no portal-specific roles
    console.log('[SALVE Portal Check-Access] ❌ No admin or portal access')
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
