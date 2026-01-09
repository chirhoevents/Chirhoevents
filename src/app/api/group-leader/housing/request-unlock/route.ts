import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Verify the group registration belongs to this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        clerkUserId: userId,
        id: eventId,
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    // Check if not locked
    if (!groupRegistration.housingAssignmentsLocked) {
      return NextResponse.json(
        { message: 'Housing assignments are not locked' },
        { status: 400 }
      )
    }

    // Check if already requested
    if (groupRegistration.housingUnlockRequested) {
      return NextResponse.json(
        { message: 'Unlock has already been requested' },
        { status: 400 }
      )
    }

    // Update the unlock request status
    await prisma.groupRegistration.update({
      where: { id: groupRegistration.id },
      data: {
        housingUnlockRequested: true,
        housingUnlockRequestedAt: new Date(),
      },
    })

    // TODO: Send email notification to org admin

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error requesting unlock:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
