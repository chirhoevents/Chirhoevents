import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/room-assignments]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Room Assignments] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // FIX 4.1: Wrap capacity check + create + occupancy update in a transaction
    // to prevent race conditions from double-booking the same bed
    let assignment
    try {
      assignment = await prisma.$transaction(async (tx) => {
        // Re-fetch room inside transaction to get current occupancy
        const freshRoom = await tx.room.findUnique({ where: { id: roomId } })
        if (!freshRoom) throw new Error('Room not found')
        if (freshRoom.currentOccupancy >= freshRoom.capacity) {
          throw new Error('Room is at capacity')
        }

        const created = await tx.roomAssignment.create({
          data: {
            roomId,
            participantId: participantId || null,
            individualRegistrationId: individualRegistrationId || null,
            bedNumber: bedNumber || null,
            assignedBy: user.id,
            notes: notes || null,
          },
        })

        await tx.room.update({
          where: { id: roomId },
          data: { currentOccupancy: { increment: 1 } },
        })

        return created
      })
    } catch (txError: any) {
      // P2002 = unique constraint violation (e.g. duplicate bedNumber in same room)
      if (txError?.code === 'P2002') {
        return NextResponse.json(
          { message: 'That bed is already assigned. Please choose a different bed.' },
          { status: 409 }
        )
      }
      if (txError?.message === 'Room is at capacity') {
        return NextResponse.json({ message: 'Room is at capacity' }, { status: 400 })
      }
      throw txError
    }

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Failed to create room assignment:', error)
    return NextResponse.json(
      { message: 'Failed to create room assignment' },
      { status: 500 }
    )
  }
}
