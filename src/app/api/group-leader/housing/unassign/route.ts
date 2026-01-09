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
    const { eventId, participantId } = body

    if (!eventId || !participantId) {
      return NextResponse.json(
        { message: 'Event ID and participant ID are required' },
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

    // Check if locked
    if (groupRegistration.housingAssignmentsLocked) {
      return NextResponse.json(
        { message: 'Housing assignments are locked. Request an unlock first.' },
        { status: 400 }
      )
    }

    // Verify the participant belongs to this group
    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        groupRegistrationId: groupRegistration.id,
      },
    })

    if (!participant) {
      return NextResponse.json(
        { message: 'Participant not found in your group' },
        { status: 404 }
      )
    }

    // Find and delete the assignment
    const assignment = await prisma.roomAssignment.findFirst({
      where: {
        participantId,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { message: 'Participant is not assigned to any room' },
        { status: 400 }
      )
    }

    // Delete the assignment
    await prisma.roomAssignment.delete({
      where: { id: assignment.id },
    })

    // Decrement room occupancy
    await prisma.room.update({
      where: { id: assignment.roomId },
      data: { currentOccupancy: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
