import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

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
    if (event.organizationId !== user.organizationId) {
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
