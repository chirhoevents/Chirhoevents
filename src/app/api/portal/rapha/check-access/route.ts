import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // Check if user is an admin - they have full access
    if (isAdmin(user)) {
      return NextResponse.json({
        authorized: true,
        isAdmin: true,
        role: user.role,
        organizationId: user.organizationId,
      })
    }

    // Check if user has portal-specific roles (rapha_user, rapha_coordinator)
    // These roles would be stored in the user's permissions object
    const portalRoles = ['rapha_user', 'rapha_coordinator', 'portals.rapha.view']
    const hasPortalRole = user.permissions
      ? portalRoles.some(role => user.permissions?.[role] === true)
      : false

    if (hasPortalRole) {
      // If eventId is provided, verify user has access to that specific event
      if (eventId) {
        // Check if the event belongs to the user's organization
        const event = await prisma.event.findFirst({
          where: {
            id: eventId,
            organizationId: user.organizationId,
          },
        })

        if (!event) {
          return NextResponse.json(
            { error: 'You do not have access to this event' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({
        authorized: true,
        isAdmin: false,
        role: hasPortalRole ? 'rapha_user' : user.role,
        organizationId: user.organizationId,
      })
    }

    // User has no admin access and no portal-specific roles
    return NextResponse.json(
      { error: 'You do not have permission to access the Rapha Medical Portal' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error checking Rapha portal access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
