import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET /api/admin/events/[eventId]/poros/housing-groups
// Returns groups with their housing assignment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET /api/admin/events/[eventId]/poros/housing-groups]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get all groups with their participants and room assignments
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        housingType: true,
        participants: {
          select: {
            id: true,
            gender: true,
            participantType: true,
          },
        },
      },
      orderBy: { groupName: 'asc' },
    })

    // Get room assignments for this event's groups
    type GroupType = typeof groups[number]
    const groupIds = groups.map((g: GroupType) => g.id)
    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        groupRegistrationId: { in: groupIds },
      },
      select: {
        groupRegistrationId: true,
        roomId: true,
        room: {
          select: {
            id: true,
            roomNumber: true,
            gender: true,
            building: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Transform data
    type RoomAssignmentType = typeof roomAssignments[number]
    type ParticipantType = GroupType['participants'][number]
    const result = groups.map((group: GroupType) => {
      const groupAssignments = roomAssignments.filter(
        (a: RoomAssignmentType) => a.groupRegistrationId === group.id
      )

      // Count participants by gender
      const maleCount = group.participants.filter(
        (p: ParticipantType) => p.gender?.toLowerCase() === 'male'
      ).length
      const femaleCount = group.participants.filter(
        (p: ParticipantType) => p.gender?.toLowerCase() === 'female'
      ).length

      // Group room assignments by gender
      const maleRoomAssignments = groupAssignments
        .filter((a: RoomAssignmentType) => a.room.gender === 'male' || !a.room.gender)
        .map((a: RoomAssignmentType) => ({
          roomId: a.roomId,
          roomNumber: a.room.roomNumber,
          buildingName: a.room.building.name,
        }))

      const femaleRoomAssignments = groupAssignments
        .filter((a: RoomAssignmentType) => a.room.gender === 'female')
        .map((a: RoomAssignmentType) => ({
          roomId: a.roomId,
          roomNumber: a.room.roomNumber,
          buildingName: a.room.building.name,
        }))

      return {
        id: group.id,
        groupName: group.groupName,
        parishName: group.parishName,
        housingType: group.housingType,
        maleCount,
        femaleCount,
        totalCount: maleCount + femaleCount,
        maleRoomAssignments,
        femaleRoomAssignments,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching housing groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch housing groups' },
      { status: 500 }
    )
  }
}
