import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - Fetch all groups with their room allocations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Group Allocations]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Group Allocations] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get the event to find organizationId
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    })

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    // Fetch all group registrations for this event with on_campus housing
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        eventId,
        housingType: 'on_campus',
      },
      include: {
        participants: {
          select: {
            id: true,
            gender: true,
            age: true,
            participantType: true,
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
        },
      },
      orderBy: { groupName: 'asc' },
    })

    // Transform data to include participant counts by category
    type GroupResult = typeof groupRegistrations[number]
    type ParticipantResult = GroupResult['participants'][number]
    const groups = groupRegistrations.map((group: GroupResult) => {
      // Count participants by category
      let maleU18Count = 0
      let femaleU18Count = 0
      let maleO18Count = 0
      let femaleO18Count = 0
      let maleChaperoneCount = 0
      let femaleChaperoneCount = 0
      let clergyCount = 0

      for (const p of group.participants) {
        const isMale = p.gender === 'male'
        const isFemale = p.gender === 'female'
        const isUnder18 = p.age < 18
        const type = p.participantType

        if (type === 'priest') {
          clergyCount++
        } else if (type === 'chaperone') {
          if (isMale) maleChaperoneCount++
          if (isFemale) femaleChaperoneCount++
        } else if (type === 'youth_u18') {
          if (isMale) maleU18Count++
          if (isFemale) femaleU18Count++
        } else if (type === 'youth_o18') {
          // Youth 18+ are treated as chaperones for housing
          if (isMale) maleO18Count++
          if (isFemale) femaleO18Count++
        } else {
          // Default based on age
          if (isUnder18) {
            if (isMale) maleU18Count++
            if (isFemale) femaleU18Count++
          } else {
            if (isMale) maleO18Count++
            if (isFemale) femaleO18Count++
          }
        }
      }

      return {
        id: group.id,
        groupName: group.groupName,
        parishName: group.parishName,
        totalParticipants: group.totalParticipants,
        housingType: group.housingType,
        maleU18Count,
        femaleU18Count,
        maleO18Count,
        femaleO18Count,
        maleChaperoneCount,
        femaleChaperoneCount,
        clergyCount,
        housingAssignmentsLocked: group.housingAssignmentsLocked,
        housingAssignmentsSubmittedAt: group.housingAssignmentsSubmittedAt,
        allocatedRooms: group.allocatedRooms.map((room: GroupResult['allocatedRooms'][number]) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          buildingName: room.building.name,
          capacity: room.capacity,
          currentOccupancy: room.currentOccupancy,
          gender: room.gender,
          housingType: room.housingType,
        })),
      }
    })

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Failed to fetch group allocations:', error)
    return NextResponse.json(
      { message: 'Failed to fetch group allocations' },
      { status: 500 }
    )
  }
}

// POST - Save room allocations for a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Group Allocations]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Group Allocations] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const { groupRegistrationId, allocations } = body

    if (!groupRegistrationId) {
      return NextResponse.json(
        { message: 'Group registration ID is required' },
        { status: 400 }
      )
    }

    // Verify group exists and belongs to this event
    const group = await prisma.groupRegistration.findFirst({
      where: {
        id: groupRegistrationId,
        eventId,
      },
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    // Get all room IDs from all allocations
    const allRoomIds: string[] = []
    for (const allocation of allocations || []) {
      allRoomIds.push(...(allocation.roomIds || []))
    }

    // First, clear previous allocations for this group
    await prisma.room.updateMany({
      where: {
        allocatedToGroupId: groupRegistrationId,
      },
      data: {
        allocatedToGroupId: null,
      },
    })

    // Now allocate the new rooms
    if (allRoomIds.length > 0) {
      // Verify all rooms exist and belong to this event
      const rooms = await prisma.room.findMany({
        where: {
          id: { in: allRoomIds },
        },
        include: {
          building: true,
        },
      })

      // Check for rooms belonging to wrong event
      type RoomWithBuilding = typeof rooms[number]
      const invalidRooms = rooms.filter((r: RoomWithBuilding) => r.building.eventId !== eventId)
      if (invalidRooms.length > 0) {
        return NextResponse.json(
          { message: 'Some rooms do not belong to this event' },
          { status: 400 }
        )
      }

      // Check for rooms already allocated to other groups
      const conflictRooms = rooms.filter(
        (r: RoomWithBuilding) => r.allocatedToGroupId && r.allocatedToGroupId !== groupRegistrationId
      )
      if (conflictRooms.length > 0) {
        return NextResponse.json(
          {
            message: `Some rooms are already allocated to other groups: ${conflictRooms
              .map((r: RoomWithBuilding) => `${r.building.name} ${r.roomNumber}`)
              .join(', ')}`,
          },
          { status: 400 }
        )
      }

      // Allocate rooms to group
      await prisma.room.updateMany({
        where: {
          id: { in: allRoomIds },
        },
        data: {
          allocatedToGroupId: groupRegistrationId,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save group allocations:', error)
    return NextResponse.json(
      { message: 'Failed to save group allocations' },
      { status: 500 }
    )
  }
}
