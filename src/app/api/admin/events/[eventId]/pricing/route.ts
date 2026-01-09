import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const { eventId } = await params

    // Fetch event with pricing and settings
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        pricing: true,
        settings: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify the event belongs to the user's organization
    if (!canAccessOrganization(user, event.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      pricing: event.pricing,
      settings: event.settings,
    })
  } catch (error) {
    console.error('Error fetching event pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
