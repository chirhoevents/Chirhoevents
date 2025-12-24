import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all ADA accessible rooms
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adaRooms = await prisma.room.findMany({
      where: {
        building: { eventId: params.eventId },
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

    return NextResponse.json(adaRooms.map(room => ({
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
