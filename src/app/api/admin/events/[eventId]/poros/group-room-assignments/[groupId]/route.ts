import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// DELETE /api/admin/events/[eventId]/poros/group-room-assignments/[groupId]
// Remove a group-level room assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/group-room-assignments/[groupId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const { roomId } = await request.json()

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: { id: groupId, eventId },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Find and delete the assignment
    const assignment = await prisma.roomAssignment.findFirst({
      where: {
        groupRegistrationId: groupId,
        roomId,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    await prisma.roomAssignment.delete({
      where: { id: assignment.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group room assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}
