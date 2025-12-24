import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const body = await request.json()

    const { roomId, participantId, individualRegistrationId, bedNumber, notes } = body

    // Check room capacity
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 })
    }

    if (room.currentOccupancy >= room.capacity) {
      return NextResponse.json({ message: 'Room is at capacity' }, { status: 400 })
    }

    // Check if already assigned
    if (participantId) {
      const existing = await prisma.roomAssignment.findFirst({
        where: { participantId },
      })
      if (existing) {
        return NextResponse.json(
          { message: 'Participant already has a room assignment' },
          { status: 400 }
        )
      }
    }

    if (individualRegistrationId) {
      const existing = await prisma.roomAssignment.findFirst({
        where: { individualRegistrationId },
      })
      if (existing) {
        return NextResponse.json(
          { message: 'Individual already has a room assignment' },
          { status: 400 }
        )
      }
    }

    // Create assignment
    const assignment = await prisma.roomAssignment.create({
      data: {
        roomId,
        participantId: participantId || null,
        individualRegistrationId: individualRegistrationId || null,
        bedNumber: bedNumber || null,
        assignedBy: user.id,
        notes: notes || null,
      },
    })

    // Update room occupancy
    await prisma.room.update({
      where: { id: roomId },
      data: { currentOccupancy: { increment: 1 } },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Failed to create room assignment:', error)
    return NextResponse.json(
      { message: 'Failed to create room assignment' },
      { status: 500 }
    )
  }
}
