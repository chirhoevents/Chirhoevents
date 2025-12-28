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
        },
        allocatedRooms: {
          include: {
            building: {
              select: {
                name: true,
              },
            },
            roomAssignments: {
              select: {
                participantId: true,
                bedNumber: true,
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

    // Get room assignments for these participants
    const participantIds = group.participants.map((p) => p.id)
    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        participantId: { in: participantIds },
      },
      include: {
        room: {
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

    // Create a map of participantId -> room assignment
    const assignmentMap = new Map(
      roomAssignments.map((ra) => [
        ra.participantId,
        {
          buildingName: ra.room.building.name,
          roomNumber: ra.room.roomNumber,
          bedNumber: ra.bedNumber,
        },
      ])
    )

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        locationName: true,
        organization: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
    })

    // Get schedule entries from Poros
    const scheduleEntries = await prisma.porosScheduleEntry.findMany({
      where: { eventId },
      orderBy: [{ day: 'asc' }, { order: 'asc' }],
    })

    // Get meal times from Poros
    const mealTimes = await prisma.porosMealTime.findMany({
      where: { eventId },
      orderBy: [{ day: 'asc' }, { order: 'asc' }],
    })

    // Generate housing summary
    const housingSummary = group.allocatedRooms.map((room) => {
      const occupantIds = room.roomAssignments
        .filter((ra) => ra.participantId)
        .map((ra) => ra.participantId)
      const occupants = group.participants.filter((p) =>
        occupantIds.includes(p.id)
      )

      return {
        building: room.building.name,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        gender: room.gender,
        housingType: room.housingType,
        occupants: occupants.map((p) => {
          const assignment = room.roomAssignments.find(
            (ra) => ra.participantId === p.id
          )
          return {
            name: `${p.firstName} ${p.lastName}`,
            bedNumber: assignment?.bedNumber,
            bedLetter: assignment?.bedNumber
              ? String.fromCharCode(64 + assignment.bedNumber)
              : null,
            participantType: p.participantType,
          }
        }),
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
        location: event?.locationName,
      },
      group: {
        id: group.id,
        name: group.groupName,
        diocese: group.dioceseName,
        accessCode: group.accessCode,
        contactEmail: group.groupLeaderEmail,
        contactPhone: group.groupLeaderPhone,
      },
      participants: {
        total: group.participants.length,
        youth: group.participants.filter(
          (p) => p.participantType !== 'chaperone' && p.participantType !== 'priest'
        ).length,
        chaperones: group.participants.filter((p) => p.participantType === 'chaperone').length,
        clergy: group.participants.filter((p) => p.participantType === 'priest').length,
        list: group.participants.map((p) => {
          const assignment = assignmentMap.get(p.id)
          return {
            name: `${p.firstName} ${p.lastName}`,
            participantType: p.participantType,
            isChaperone: p.participantType === 'chaperone',
            isClergy: p.participantType === 'priest',
            gender: p.gender,
            housing: assignment
              ? {
                  building: assignment.buildingName,
                  room: assignment.roomNumber,
                  bed: assignment.bedNumber
                    ? String.fromCharCode(64 + assignment.bedNumber)
                    : null,
                }
              : null,
          }
        }),
      },
      housing: {
        totalRooms: group.allocatedRooms.length,
        summary: housingSummary,
      },
      inserts: inserts.map((i) => ({
        name: i.name,
        fileUrl: i.fileUrl,
        displayOrder: i.displayOrder,
      })),
      settings: settings || {
        includeCampusMap: true,
        includeMealSchedule: true,
        includeEventSchedule: true,
        includeEmergencyProcedures: true,
        includeHousingColumn: true,
      },
      resources: {
        campusMapUrl: settings?.campusMapUrl || null,
        emergencyProceduresUrl: settings?.emergencyProceduresUrl || null,
        welcomeLetterText: settings?.welcomeLetterText || null,
        schedule: scheduleEntries.map((entry) => ({
          day: entry.day,
          startTime: entry.startTime,
          endTime: entry.endTime,
          title: entry.title,
          location: entry.location,
          description: entry.description,
        })),
        mealTimes: mealTimes.map((mt) => ({
          day: mt.day,
          meal: mt.meal,
          time: mt.time,
          color: mt.color,
        })),
      },
      missingResources: {
        campusMap: !settings?.campusMapUrl,
        mealSchedule: mealTimes.length === 0,
        eventSchedule: scheduleEntries.length === 0,
        emergencyProcedures: !settings?.emergencyProceduresUrl,
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

    // Check for missing resources
    const scheduleCount = await prisma.porosScheduleEntry.count({
      where: { eventId },
    })

    const mealTimesCount = await prisma.porosMealTime.count({
      where: { eventId },
    })

    return NextResponse.json({
      settings: settings || {
        includeCampusMap: true,
        includeMealSchedule: true,
        includeEventSchedule: true,
        includeEmergencyProcedures: true,
        includeHousingColumn: true,
      },
      inserts,
      missingResources: {
        campusMap: !settings?.campusMapUrl,
        mealSchedule: mealTimesCount === 0,
        eventSchedule: scheduleCount === 0,
        emergencyProcedures: !settings?.emergencyProceduresUrl,
      },
    })
  } catch (error) {
    console.error('Failed to fetch packet settings:', error)
    return NextResponse.json(
      { message: 'Failed to fetch packet settings' },
      { status: 500 }
    )
  }
}
