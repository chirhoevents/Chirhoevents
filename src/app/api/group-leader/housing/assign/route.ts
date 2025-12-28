import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, participantId, roomId, bedNumber } = body

    if (!eventId || !participantId || !roomId || !bedNumber) {
      return NextResponse.json(
        { message: 'Event ID, participant ID, room ID, and bed number are required' },
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

    // Verify the room is allocated to this group
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        allocatedToGroupId: groupRegistration.id,
      },
    })

    if (!room) {
      return NextResponse.json(
        { message: 'Room is not allocated to your group' },
        { status: 400 }
      )
    }

    // Verify bed number is valid
    if (bedNumber < 1 || bedNumber > room.capacity) {
      return NextResponse.json(
        { message: 'Invalid bed number' },
        { status: 400 }
      )
    }

    // Check if bed is already taken
    const existingAssignment = await prisma.roomAssignment.findFirst({
      where: {
        roomId,
        bedNumber,
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { message: 'This bed is already assigned' },
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

    // Check if participant is already assigned somewhere
    const existingParticipantAssignment = await prisma.roomAssignment.findFirst({
      where: {
        participantId,
      },
    })

    if (existingParticipantAssignment) {
      // Remove existing assignment first
      await prisma.roomAssignment.delete({
        where: { id: existingParticipantAssignment.id },
      })

      // Decrement old room occupancy
      await prisma.room.update({
        where: { id: existingParticipantAssignment.roomId },
        data: { currentOccupancy: { decrement: 1 } },
      })
    }

    // Create the assignment
    await prisma.roomAssignment.create({
      data: {
        roomId,
        participantId,
        groupRegistrationId: groupRegistration.id,
        bedNumber,
      },
    })

    // Increment room occupancy
    await prisma.room.update({
      where: { id: roomId },
      data: { currentOccupancy: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error assigning participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
