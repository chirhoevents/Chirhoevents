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
      const transformedBuildings = buildingsWithRooms.map((building) => ({
        ...building,
        rooms: building.rooms.map((room) => ({
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
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
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
