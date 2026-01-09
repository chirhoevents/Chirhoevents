import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const { eventId, id } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/room-assignments/[id]]',
    })
    if (error) return error
    const body = await request.json().catch(() => ({}))
    const { type } = body

    // Find assignment by participant or individual ID
    let assignment
    if (type === 'group') {
      assignment = await prisma.roomAssignment.findFirst({
        where: { participantId: id },
      })
    } else if (type === 'individual') {
      assignment = await prisma.roomAssignment.findFirst({
        where: { individualRegistrationId: id },
      })
    } else {
      // Try both
      assignment = await prisma.roomAssignment.findFirst({
        where: {
          OR: [{ participantId: id }, { individualRegistrationId: id }, { id }],
        },
      })
    }

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 })
    }

    // Delete assignment
    await prisma.roomAssignment.delete({
      where: { id: assignment.id },
    })

    // Update room occupancy
    await prisma.room.update({
      where: { id: assignment.roomId },
      data: { currentOccupancy: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete room assignment:', error)
    return NextResponse.json(
      { message: 'Failed to delete room assignment' },
      { status: 500 }
    )
  }
}
