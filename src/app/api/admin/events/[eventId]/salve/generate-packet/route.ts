import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

// Helper function to check if user can access Salve portal
async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if user has salve.access permission (covers salve_coordinator, event_manager, org_admin, master_admin)
  // Also check custom permissions for salve_user role or explicit portal access
  const hasSalvePermission = hasPermission(user.role, 'salve.access')
  const hasCustomSalveAccess = user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true

  if (!hasSalvePermission && !hasCustomSalveAccess) {
    console.error(`[SALVE] ❌ User ${user.email} (role: ${user.role}) lacks salve.access permission`)
    throw new Error('Access denied - SALVE portal access required')
  }

  // Verify the event belongs to the user's organization (unless master_admin)
  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      throw new Error('Access denied to this event')
    }
  }

  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)
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

    // Get room assignments for these participants (individual-level)
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

    // Get group-level room assignments (used by POROS GroupAssignments)
    const groupRoomAssignments = await prisma.roomAssignment.findMany({
      where: {
        groupRegistrationId: groupId,
        participantId: null, // Group-level assignments don't have participantId
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

    // Get meal color assignment for this group
    const mealGroupAssignment = await prisma.mealGroupAssignment.findFirst({
      where: { groupRegistrationId: groupId },
      include: {
        mealGroup: {
          select: {
            name: true,
            colorHex: true,
            breakfastTime: true,
            lunchTime: true,
            dinnerTime: true,
            sundayBreakfastTime: true,
          },
        },
      },
    })

    // Get small group staff assignments (SGL, Religious)
    const staffAssignments = await prisma.groupStaffAssignment.findMany({
      where: { groupRegistrationId: groupId },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            staffType: true,
          },
        },
      },
    })

    // Get small group room assignment
    const groupWithSmallGroupRoom = await prisma.groupRegistration.findUnique({
      where: { id: groupId },
      select: {
        smallGroupRoom: {
          select: {
            roomNumber: true,
            building: { select: { name: true } },
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

    // Get event details with settings
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
        settings: {
          select: {
            salvePacketSettings: true,
          },
        },
      },
    })

    // Get event pricing for invoice calculation
    const eventPricing = await prisma.eventPricing.findFirst({
      where: { eventId },
    })

    // Get payments for invoice
    const payments = await prisma.payment.findMany({
      where: { registrationId: groupId },
      orderBy: { createdAt: 'asc' },
    })

    // Calculate invoice totals
    const youthCount = group.participants.filter(
      (p: any) => p.participantType !== 'chaperone' && p.participantType !== 'priest'
    ).length
    const chaperoneCount = group.participants.filter((p: any) => p.participantType === 'chaperone').length
    const clergyCount = group.participants.filter((p: any) => p.participantType === 'priest').length

    const youthPrice = Number(eventPricing?.youthRegularPrice || 0)
    const chaperonePrice = Number(eventPricing?.chaperoneRegularPrice || 0)
    const clergyPrice = Number(eventPricing?.priestPrice || 0)

    const totalAmount = (youthCount * youthPrice) + (chaperoneCount * chaperonePrice) + (clergyCount * clergyPrice)
    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    const balanceRemaining = totalAmount - totalPaid

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

    // Get confession times from Poros (using raw SQL since Prisma client may not have this model yet)
    let confessionTimes: any[] = []
    try {
      confessionTimes = await prisma.$queryRaw`
        SELECT id, event_id as "eventId", day,
               start_time as "startTime", end_time as "endTime",
               location, description, "order"
        FROM poros_confessions
        WHERE event_id = ${eventId}::uuid AND is_active = true
        ORDER BY "order" ASC, day ASC, start_time ASC
      `
    } catch (confessionError) {
      console.warn('[SALVE] Could not fetch confession times:', confessionError)
    }

    // Generate housing summary from multiple sources:
    // 1. allocatedRooms (old system: Room.allocatedToGroupId)
    // 2. groupRoomAssignments (new system: RoomAssignment with groupRegistrationId, no participantId)
    // 3. roomAssignments (individual: RoomAssignment with participantId)
    let housingSummary: any[] = []

    if (group.allocatedRooms.length > 0) {
      // Old system: rooms allocated directly to group via Room.allocatedToGroupId
      housingSummary = group.allocatedRooms.map((room: any) => {
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
    } else if (groupRoomAssignments.length > 0) {
      // New system: group-level RoomAssignment records (from POROS GroupAssignments UI)
      housingSummary = groupRoomAssignments.map((ra: any) => ({
        building: ra.room.building.name,
        roomNumber: ra.room.roomNumber,
        floor: ra.room.floor,
        capacity: ra.room.capacity,
        gender: ra.room.gender,
        housingType: ra.room.housingType,
        occupants: [], // Group-level assignments don't track individual occupants
      }))
    } else if (roomAssignments.length > 0) {
      // Fallback: individual participant room assignments
      const roomMap = new Map<string, { room: any; occupants: any[] }>()

      for (const ra of roomAssignments) {
        const roomKey = ra.room.id || `${ra.room.building.name}-${ra.room.roomNumber}`
        if (!roomMap.has(roomKey)) {
          roomMap.set(roomKey, {
            room: ra.room,
            occupants: [],
          })
        }
        const participant = group.participants.find((p: any) => p.id === ra.participantId)
        if (participant) {
          roomMap.get(roomKey)!.occupants.push({
            name: `${participant.firstName} ${participant.lastName}`,
            bedNumber: ra.bedNumber,
            bedLetter: ra.bedNumber
              ? String.fromCharCode(64 + ra.bedNumber)
              : null,
            participantType: participant.participantType,
          })
        }
      }

      housingSummary = Array.from(roomMap.values()).map(({ room, occupants }) => ({
        building: room.building.name,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        gender: room.gender,
        housingType: room.housingType,
        occupants,
      }))
    }

    // Extract SGL and Religious staff
    const sglStaff = staffAssignments
      .filter((a: any) => a.role === 'sgl')
      .map((a: any) => `${a.staff.firstName} ${a.staff.lastName}`)
    const religiousStaff = staffAssignments
      .filter((a: any) => a.role === 'religious')
      .map((a: any) => `${a.staff.firstName} ${a.staff.lastName}`)

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
      // Meal Color assignment
      mealColor: mealGroupAssignment?.mealGroup ? {
        name: mealGroupAssignment.mealGroup.name,
        colorHex: mealGroupAssignment.mealGroup.colorHex,
        saturdayBreakfast: mealGroupAssignment.mealGroup.breakfastTime,
        saturdayLunch: mealGroupAssignment.mealGroup.lunchTime,
        saturdayDinner: mealGroupAssignment.mealGroup.dinnerTime,
        sundayBreakfast: mealGroupAssignment.mealGroup.sundayBreakfastTime,
      } : null,
      // Small Group assignment
      smallGroup: {
        sgl: sglStaff.length > 0 ? sglStaff.join(', ') : null,
        religious: religiousStaff.length > 0 ? religiousStaff.join(', ') : null,
        meetingRoom: groupWithSmallGroupRoom?.smallGroupRoom
          ? `${groupWithSmallGroupRoom.smallGroupRoom.building.name} - ${groupWithSmallGroupRoom.smallGroupRoom.roomNumber}`
          : null,
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
        totalRooms: housingSummary.length,
        summary: housingSummary,
      },
      inserts: inserts.map((i: any) => ({
        name: i.name,
        fileUrl: i.fileUrl,
        imageUrls: i.imageUrls,
        fileType: i.fileType,
        displayOrder: i.displayOrder,
        isActive: i.isActive,
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
        confessionTimes: confessionTimes.map((ct: any) => ({
          day: ct.day,
          startTime: ct.startTime,
          endTime: ct.endTime,
          location: ct.location,
          confessor: ct.description,
        })),
      },
      missingResources: {
        campusMap: !settings?.campusMapUrl,
        mealSchedule: mealTimes.length === 0,
        eventSchedule: scheduleEntries.length === 0,
        emergencyProcedures: !settings?.emergencyProceduresUrl,
      },
      // Invoice data
      invoice: {
        groupName: group.groupName,
        groupLeaderName: group.groupLeaderName || group.groupLeaderEmail,
        groupLeaderEmail: group.groupLeaderEmail,
        accessCode: group.accessCode,
        lineItems: [
          ...(youthCount > 0 ? [{
            description: 'Youth Registration',
            quantity: youthCount,
            unitPrice: youthPrice,
            total: youthCount * youthPrice,
          }] : []),
          ...(chaperoneCount > 0 ? [{
            description: 'Chaperone Registration',
            quantity: chaperoneCount,
            unitPrice: chaperonePrice,
            total: chaperoneCount * chaperonePrice,
          }] : []),
          ...(clergyCount > 0 ? [{
            description: 'Clergy Registration',
            quantity: clergyCount,
            unitPrice: clergyPrice,
            total: clergyCount * clergyPrice,
          }] : []),
        ],
        payments: payments.map((p: any) => ({
          date: p.createdAt,
          method: p.paymentMethod || 'Payment',
          amount: Number(p.amount),
          reference: p.stripePaymentIntentId || p.checkNumber || p.id,
        })),
        totalAmount,
        totalPaid,
        balanceRemaining,
      },
      // Print settings from welcome packets editor (what to include in the packet)
      packetPrintSettings: event?.settings?.salvePacketSettings || {
        includeSchedule: true,
        includeConfessionSchedule: true,
        includeMap: true,
        includeRoster: true,
        includeHousingAssignments: true,
        includeEmergencyContacts: true,
        includeInvoice: false,
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
    await requireSalveAccess(request, eventId)

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
