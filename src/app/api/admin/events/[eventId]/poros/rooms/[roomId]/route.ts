import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string; roomId: string } }
) {
  try {
    const user = await requireAdmin()
    const { roomId } = params
    const body = await request.json()

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        buildingId: body.buildingId,
        roomNumber: body.roomNumber,
        floor: body.floor,
        bedCount: body.capacity,
        roomType: body.roomType,
        gender: body.gender,
        housingType: body.housingType,
        capacity: body.capacity,
        notes: body.notes,
        isAvailable: body.isAvailable,
        isAdaAccessible: body.isAdaAccessible,
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Failed to update room:', error)
    return NextResponse.json(
      { message: 'Failed to update room' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; roomId: string } }
) {
  try {
    const user = await requireAdmin()
    const { roomId } = params

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    await prisma.room.delete({
      where: { id: roomId },
    })

    // Update building counts
    if (room) {
      const rooms = await prisma.room.findMany({
        where: { buildingId: room.buildingId },
      })
      await prisma.building.update({
        where: { id: room.buildingId },
        data: {
          totalRooms: rooms.length,
          totalBeds: rooms.reduce((sum, r) => sum + r.capacity, 0),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json(
      { message: 'Failed to delete room' },
      { status: 500 }
    )
  }
}
