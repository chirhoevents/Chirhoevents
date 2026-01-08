import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// Helper function to check if user can access Salve portal
async function requireSalveAccess(eventId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Admins always have access
  if (isAdmin(user)) {
    return user
  }

  // Check for Salve-specific roles
  const portalRoles = ['salve_user', 'salve_coordinator', 'portals.salve.view']
  const hasPortalRole = user.permissions
    ? portalRoles.some(role => user.permissions?.[role] === true)
    : false

  if (!hasPortalRole) {
    throw new Error('Access denied')
  }

  // Verify the event belongs to the user's organization
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: user.organizationId,
    },
  })

  if (!event) {
    throw new Error('Access denied to this event')
  }

  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(eventId)
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
    const participantIds = group.participants.map((p: any) => p.id)
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
    const assignmentMap = new Map<string, { buildingName: string; roomNumber: string; bedNumber: number | null }>(
      roomAssignments.map((ra: any) => [
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
    const housingSummary = group.allocatedRooms.map((room: any) => {
      const occupantIds = room.roomAssignments
        .filter((ra: any) => ra.participantId)
        .map((ra: any) => ra.participantId)
      const occupants = group.participants.filter((p: any) =>
        occupantIds.includes(p.id)
      )

      return {
        building: room.building.name,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        gender: room.gender,
        housingType: room.housingType,
        occupants: occupants.map((p: any) => {
          const assignment = room.roomAssignments.find(
            (ra: any) => ra.participantId === p.id
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
          (p: any) => p.participantType !== 'chaperone' && p.participantType !== 'priest'
        ).length,
        chaperones: group.participants.filter((p: any) => p.participantType === 'chaperone').length,
        clergy: group.participants.filter((p: any) => p.participantType === 'priest').length,
        list: group.participants.map((p: any) => {
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
      inserts: inserts.map((i: any) => ({
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
        schedule: scheduleEntries.map((entry: any) => ({
          day: entry.day,
          startTime: entry.startTime,
          endTime: entry.endTime,
          title: entry.title,
          location: entry.location,
          description: entry.description,
        })),
        mealTimes: mealTimes.map((mt: any) => ({
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(eventId)

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
  } catch (error: any) {
    console.error('Failed to fetch packet settings:', error)

    // Return more specific error messages
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { message: 'Please sign in to view packet settings' },
        { status: 401 }
      )
    }
    if (error.message === 'Access denied' || error.message === 'Access denied to this event') {
      return NextResponse.json(
        { message: 'You do not have permission to view packet settings for this event' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { message: 'Failed to fetch packet settings' },
      { status: 500 }
    )
  }
}
