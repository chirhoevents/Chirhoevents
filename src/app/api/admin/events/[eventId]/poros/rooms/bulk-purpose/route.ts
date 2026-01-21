import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/events/[eventId]/poros/rooms/bulk-purpose
// Update the purpose of multiple rooms at once
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PATCH /api/admin/events/[eventId]/poros/rooms/bulk-purpose]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const { roomIds, roomPurpose } = await request.json()

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json(
        { error: 'No room IDs provided' },
        { status: 400 }
      )
    }

    if (!roomPurpose || !['housing', 'small_group'].includes(roomPurpose)) {
      return NextResponse.json(
        { error: 'Invalid room purpose. Must be "housing" or "small_group"' },
        { status: 400 }
      )
    }

    // Verify all rooms belong to this event
    const rooms = await prisma.room.findMany({
      where: {
        id: { in: roomIds },
        building: { eventId },
      },
    })

    if (rooms.length !== roomIds.length) {
      return NextResponse.json(
        { error: 'Some rooms not found or do not belong to this event' },
        { status: 400 }
      )
    }

    // Update all rooms
    const result = await prisma.room.updateMany({
      where: {
        id: { in: roomIds },
        building: { eventId },
      },
      data: {
        roomPurpose,
      },
    })

    return NextResponse.json({
      success: true,
      count: result.count,
    })
  } catch (error) {
    console.error('Failed to bulk update room purposes:', error)
    return NextResponse.json(
      { error: 'Failed to update rooms' },
      { status: 500 }
    )
  }
}
