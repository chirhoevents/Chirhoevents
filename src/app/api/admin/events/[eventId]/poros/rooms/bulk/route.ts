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
    const { rooms } = body

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json(
        { message: 'No rooms provided' },
        { status: 400 }
      )
    }

    const createdRooms = await prisma.room.createMany({
      data: rooms.map((room: any) => ({
        buildingId: room.buildingId,
        roomNumber: room.roomNumber,
        floor: room.floor || 1,
        bedCount: room.capacity || room.bedCount || 2,
        roomType: room.roomType,
        gender: room.gender,
        housingType: room.housingType,
        capacity: room.capacity || 2,
        currentOccupancy: 0,
        isAvailable: room.isAvailable ?? true,
        isAdaAccessible: room.isAdaAccessible ?? false,
      })),
      skipDuplicates: true,
    })

    // Update building counts
    const buildingIds = [...new Set(rooms.map((r: any) => r.buildingId))]
    for (const buildingId of buildingIds) {
      const buildingRooms = await prisma.room.findMany({
        where: { buildingId },
      })
      await prisma.building.update({
        where: { id: buildingId },
        data: {
          totalRooms: buildingRooms.length,
          totalBeds: buildingRooms.reduce((sum, r) => sum + r.capacity, 0),
        },
      })
    }

    return NextResponse.json({ count: createdRooms.count }, { status: 201 })
  } catch (error) {
    console.error('Failed to create rooms:', error)
    return NextResponse.json(
      { message: 'Failed to create rooms' },
      { status: 500 }
    )
  }
}
