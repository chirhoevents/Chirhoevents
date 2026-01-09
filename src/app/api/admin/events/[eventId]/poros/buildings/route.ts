import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Buildings]',
    })
    if (error) return error
    const { searchParams } = new URL(request.url)
    const includeRooms = searchParams.get('includeRooms') === 'true'

    if (includeRooms) {
      const buildingsWithRooms = await prisma.building.findMany({
        where: { eventId },
        orderBy: { displayOrder: 'asc' },
        include: {
          rooms: {
            orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
            include: {
              allocatedToGroup: {
                select: {
                  id: true,
                  groupName: true,
                },
              },
            },
          },
        },
      })

      // Transform to include allocatedToGroupName on rooms
      type BuildingResult = typeof buildingsWithRooms[number]
      type RoomResult = BuildingResult['rooms'][number]
      const transformedBuildings = buildingsWithRooms.map((building: BuildingResult) => ({
        ...building,
        rooms: building.rooms.map((room: RoomResult) => ({
          ...room,
          allocatedToGroupName: room.allocatedToGroup?.groupName || null,
          allocatedToGroup: undefined,
        })),
      }))
      return NextResponse.json(transformedBuildings)
    }

    const buildings = await prisma.building.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json(buildings)
  } catch (error) {
    console.error('Failed to fetch buildings:', error)
    return NextResponse.json(
      { message: 'Failed to fetch buildings' },
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
      logPrefix: '[POST Buildings]',
    })
    if (error) return error
    const body = await request.json()

    const building = await prisma.building.create({
      data: {
        eventId,
        name: body.name,
        gender: body.gender,
        housingType: body.housingType,
        totalFloors: body.totalFloors || 1,
        notes: body.notes || null,
        displayOrder: body.displayOrder || 0,
      },
    })

    return NextResponse.json(building, { status: 201 })
  } catch (error) {
    console.error('Failed to create building:', error)
    return NextResponse.json(
      { message: 'Failed to create building' },
      { status: 500 }
    )
  }
}
