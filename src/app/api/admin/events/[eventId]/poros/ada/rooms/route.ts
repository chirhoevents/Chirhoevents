import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface RoomWithBuilding {
  id: string
  buildingId: string
  roomNumber: string
  floor: number
  capacity: number
  currentOccupancy: number
  adaFeatures: string | null
  building: { name: string }
}

// GET - List all ADA accessible rooms
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET ADA Rooms]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET ADA Rooms] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const adaRooms = await prisma.room.findMany({
      where: {
        building: { eventId: eventId },
        isAdaAccessible: true,
      },
      include: {
        building: {
          select: { name: true }
        }
      },
      orderBy: [
        { building: { name: 'asc' } },
        { floor: 'asc' },
        { roomNumber: 'asc' }
      ]
    })

    return NextResponse.json(adaRooms.map((room: RoomWithBuilding) => ({
      id: room.id,
      buildingId: room.buildingId,
      buildingName: room.building.name,
      roomNumber: room.roomNumber,
      floor: room.floor,
      capacity: room.capacity,
      currentOccupancy: room.currentOccupancy,
      adaFeatures: room.adaFeatures,
    })))
  } catch (error) {
    console.error('ADA rooms fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ADA rooms' }, { status: 500 })
  }
}
