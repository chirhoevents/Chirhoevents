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

    // Check if we need full assignment details (for print feature)
    const { searchParams } = new URL(request.url)
    const includeAssignments = searchParams.get('includeAssignments') === 'true'
    const purposeFilter = searchParams.get('purpose') // 'housing', 'small_group', 'both', or null for all

    // Build where clause with optional purpose filter
    let whereClause: any = {
      building: { eventId },
    }

    if (purposeFilter === 'housing') {
      // For housing: rooms with purpose 'housing' or NULL (default)
      whereClause = {
        AND: [
          { building: { eventId } },
          {
            OR: [
              { roomPurpose: 'housing' },
              { roomPurpose: null }
            ]
          }
        ]
      }
    } else if (purposeFilter === 'small_group') {
      // For small groups: only rooms explicitly set to 'small_group'
      whereClause.roomPurpose = 'small_group'
    }
    // If no purposeFilter, show all rooms

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        building: true,
        roomAssignments: includeAssignments ? {
          include: {
            ...(includeAssignments && {
              // Note: Prisma doesn't support conditional relations directly
              // We'll handle this separately
            })
          }
        } : true,
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { roomNumber: 'asc' }],
    })

    // If full assignments requested, fetch additional details
    if (includeAssignments) {
      type RoomType = typeof rooms[number]
      const roomsWithDetails = await Promise.all(rooms.map(async (room: RoomType) => {
        const assignments = await prisma.roomAssignment.findMany({
          where: { roomId: room.id },
          select: {
            id: true,
            groupRegistrationId: true,
            participantId: true,
            bedNumber: true,
            notes: true,
          }
        })

        // Get group registration details for assignments
        type AssignmentType = typeof assignments[number]
        const assignmentsWithDetails = await Promise.all(assignments.map(async (assignment: AssignmentType) => {
          let groupRegistration = null
          let participant = null

          if (assignment.groupRegistrationId) {
            groupRegistration = await prisma.groupRegistration.findUnique({
              where: { id: assignment.groupRegistrationId },
              select: { groupName: true, parishName: true }
            })
          }

          if (assignment.participantId) {
            participant = await prisma.participant.findUnique({
              where: { id: assignment.participantId },
              select: {
                firstName: true,
                lastName: true,
                groupRegistration: { select: { parishName: true } }
              }
            })
          }

          return { ...assignment, groupRegistration, participant }
        }))

        return { ...room, assignments: assignmentsWithDetails }
      }))

      return NextResponse.json({ rooms: roomsWithDetails })
    }

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
        roomPurpose: body.roomPurpose || 'housing',
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
