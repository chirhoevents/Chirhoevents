import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: eventId } = params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = [
      'draft',
      'published',
      'registration_open',
      'registration_closed',
      'in_progress',
      'completed',
      'cancelled',
    ]

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: user.organizationId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Update event status
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status },
    })

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    })
  } catch (error) {
    console.error('Error updating event status:', error)
    return NextResponse.json(
      { error: 'Failed to update event status' },
      { status: 500 }
    )
  }
}
