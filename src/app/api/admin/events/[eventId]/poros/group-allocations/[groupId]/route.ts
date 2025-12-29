import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET - Fetch allocations for a specific group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { eventId, groupId } = await params

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: {
        id: groupId,
        eventId,
      },
      include: {
        allocatedRooms: {
          include: {
            building: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    type RoomResult = typeof group.allocatedRooms[number]
    return NextResponse.json({
      groupId: group.id,
      groupName: group.groupName,
      allocatedRooms: group.allocatedRooms.map((room: RoomResult) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        buildingName: room.building.name,
        capacity: room.capacity,
        currentOccupancy: room.currentOccupancy,
        gender: room.gender,
        housingType: room.housingType,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch group allocations:', error)
    return NextResponse.json(
      { message: 'Failed to fetch group allocations' },
      { status: 500 }
    )
  }
}

// DELETE - Clear all room allocations for a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { eventId, groupId } = await params

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: {
        id: groupId,
        eventId,
      },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    // Clear all room allocations for this group
    await prisma.room.updateMany({
      where: {
        allocatedToGroupId: groupId,
      },
      data: {
        allocatedToGroupId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to clear group allocations:', error)
    return NextResponse.json(
      { message: 'Failed to clear group allocations' },
      { status: 500 }
    )
  }
}
