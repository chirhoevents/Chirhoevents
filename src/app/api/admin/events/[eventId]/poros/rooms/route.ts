import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params

    const rooms = await prisma.room.findMany({
      where: {
        building: { eventId },
      },
      include: {
        building: true,
        assignments: {
          include: {
            participant: true,
            individualRegistration: true,
          },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
    return NextResponse.json(
      { message: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const body = await request.json()

    const room = await prisma.room.create({
      data: {
        buildingId: body.buildingId,
        roomNumber: body.roomNumber,
        floor: body.floor || 1,
        bedCount: body.capacity || body.bedCount || 2,
        roomType: body.roomType,
        gender: body.gender,
        housingType: body.housingType,
        capacity: body.capacity || 2,
        currentOccupancy: 0,
        notes: body.notes,
        isAvailable: body.isAvailable ?? true,
        isAdaAccessible: body.isAdaAccessible ?? false,
      },
    })

    // Update building room/bed counts
    await updateBuildingCounts(body.buildingId)

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json(
      { message: 'Failed to create room' },
      { status: 500 }
    )
  }
}

async function updateBuildingCounts(buildingId: string) {
  const rooms = await prisma.room.findMany({
    where: { buildingId },
  })

  await prisma.building.update({
    where: { id: buildingId },
    data: {
      totalRooms: rooms.length,
      totalBeds: rooms.reduce((sum, r) => sum + r.capacity, 0),
    },
  })
}
