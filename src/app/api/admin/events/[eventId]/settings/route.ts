import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { eventId } = params
    const body = await request.json()
    const { waitlistEnabled, registrationClosedMessage } = body

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: user.organizationId },
      include: { settings: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Update or create event settings
    const settings = await prisma.eventSettings.upsert({
      where: { eventId },
      update: {
        waitlistEnabled: waitlistEnabled ?? undefined,
        registrationClosedMessage: registrationClosedMessage,
      },
      create: {
        eventId,
        waitlistEnabled: waitlistEnabled ?? false,
        registrationClosedMessage: registrationClosedMessage,
      },
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Error updating event settings:', error)
    return NextResponse.json(
      { error: 'Failed to update event settings' },
      { status: 500 }
    )
  }
}
