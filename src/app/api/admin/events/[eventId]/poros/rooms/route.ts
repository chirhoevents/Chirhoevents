import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

interface RoomRecord {
  id: string
  capacity: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET /api/admin/events/[eventId]/poros/rooms]',
    })
    if (error) return error

    // Permission check - only users with poros.access can view rooms
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Rooms] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const rooms = await prisma.room.findMany({
      where: {
        building: { eventId },
      },
      include: {
        building: true,
        roomAssignments: true,
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/rooms]',
    })
    if (error) return error

    // Permission check - only users with poros.access can create rooms
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Rooms] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

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
      totalBeds: rooms.reduce((sum: number, r: RoomRecord) => sum + r.capacity, 0),
    },
  })
}
