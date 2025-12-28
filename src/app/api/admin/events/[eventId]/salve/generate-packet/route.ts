import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await requireAdmin()
    const { eventId } = params
    const body = await request.json()

    const { groupId } = body

    if (!groupId) {
      return NextResponse.json(
        { message: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Get welcome packet settings
    const settings = await prisma.welcomePacketSettings.findFirst({
      where: { eventId },
    })

    // Get packet inserts
    const inserts = await prisma.welcomePacketInsert.findMany({
      where: {
        eventId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    })

    // Get group with all details
    const group = await prisma.groupRegistration.findFirst({
      where: {
        id: groupId,
        eventId,
      },
      include: {
        participants: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          include: {
            housingAssignment: {
              include: {
                building: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        allocatedRooms: {
          include: {
            building: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [
            { building: { name: 'asc' } },
            { roomNumber: 'asc' },
          ],
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      )
    }

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        location: true,
        organization: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
    })

    // Generate housing summary
    const housingSummary = group.allocatedRooms.map((room) => {
      const occupants = group.participants.filter(
        (p) => p.housingAssignmentId === room.id
      )

      return {
        building: room.building.name,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        gender: room.gender,
        housingType: room.housingType,
        occupants: occupants.map((p) => ({
          name: `${p.firstName} ${p.lastName}`,
          bedNumber: p.bedNumber,
          bedLetter: p.bedNumber ? String.fromCharCode(64 + p.bedNumber) : null,
          participantType: p.participantType,
        })),
      }
    })

    // Build the packet data
    const packetData = {
      event: {
        name: event?.name,
        organizationName: event?.organization?.name,
        logoUrl: event?.organization?.logoUrl,
        startDate: event?.startDate,
        endDate: event?.endDate,
        location: event?.location,
      },
      group: {
        id: group.id,
        name: group.groupName,
        diocese: group.diocese,
        accessCode: group.accessCode,
        contactEmail: group.contactEmail,
        contactPhone: group.contactPhone,
      },
      participants: {
        total: group.participants.length,
        youth: group.participants.filter(
          (p) => !p.isChaperone && !p.isClergy
        ).length,
        chaperones: group.participants.filter((p) => p.isChaperone).length,
        clergy: group.participants.filter((p) => p.isClergy).length,
        list: group.participants.map((p) => ({
          name: `${p.firstName} ${p.lastName}`,
          participantType: p.participantType,
          isChaperone: p.isChaperone,
          isClergy: p.isClergy,
          gender: p.gender,
          housing: p.housingAssignment
            ? {
                building: p.housingAssignment.building.name,
                room: p.housingAssignment.roomNumber,
                bed: p.bedNumber
                  ? String.fromCharCode(64 + p.bedNumber)
                  : null,
              }
            : null,
        })),
      },
      housing: {
        totalRooms: group.allocatedRooms.length,
        summary: housingSummary,
      },
      inserts: inserts.map((i) => ({
        title: i.title,
        content: i.content,
        type: i.insertType,
      })),
      settings: settings || {
        includeSchedule: true,
        includeMap: true,
        includeRoster: true,
        includeHousingAssignments: true,
        includeEmergencyContacts: true,
      },
      generatedAt: new Date(),
    }

    return NextResponse.json(packetData)
  } catch (error) {
    console.error('Failed to generate welcome packet:', error)
    return NextResponse.json(
      { message: 'Failed to generate welcome packet' },
      { status: 500 }
    )
  }
}

// GET - Fetch packet settings and available inserts
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await requireAdmin()
    const { eventId } = params

    const settings = await prisma.welcomePacketSettings.findFirst({
      where: { eventId },
    })

    const inserts = await prisma.welcomePacketInsert.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({
      settings: settings || {
        includeSchedule: true,
        includeMap: true,
        includeRoster: true,
        includeHousingAssignments: true,
        includeEmergencyContacts: true,
      },
      inserts,
    })
  } catch (error) {
    console.error('Failed to fetch packet settings:', error)
    return NextResponse.json(
      { message: 'Failed to fetch packet settings' },
      { status: 500 }
    )
  }
}
