import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// POST /api/admin/events/[eventId]/poros/group-room-assignments
// Create a group-level room assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/group-room-assignments]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const { groupRegistrationId, roomId, gender } = await request.json()

    if (!groupRegistrationId || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: { id: groupRegistrationId, eventId },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Verify room exists and belongs to this event
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        building: { eventId },
      },
      include: { building: true },
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.roomAssignment.findFirst({
      where: {
        groupRegistrationId,
        roomId,
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Group is already assigned to this room' },
        { status: 400 }
      )
    }

    // Create the assignment
    const assignment = await prisma.roomAssignment.create({
      data: {
        roomId,
        groupRegistrationId,
        assignedBy: user?.id,
        notes: `${gender || 'mixed'} housing assignment`,
      },
    })

    return NextResponse.json({
      success: true,
      assignment,
    })
  } catch (error) {
    console.error('Error creating group room assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}
