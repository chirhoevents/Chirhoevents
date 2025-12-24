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

    // Get participants from group registrations (on_campus only)
    const groupParticipants = await prisma.participant.findMany({
      where: {
        groupRegistration: {
          eventId,
          housingType: 'on_campus',
        },
      },
      include: {
        groupRegistration: {
          select: { parishName: true },
        },
      },
    })

    // Get individual registrations (on_campus only)
    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: {
        eventId,
        housingType: 'on_campus',
      },
    })

    // Get room assignments for all participants and individuals
    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        OR: [
          { participantId: { in: groupParticipants.map(p => p.id) } },
          { individualRegistrationId: { in: individualRegistrations.map(r => r.id) } },
        ],
      },
      include: {
        room: {
          include: { building: true },
        },
      },
    })

    // Create lookup maps
    const participantAssignmentMap = new Map(
      roomAssignments
        .filter(a => a.participantId)
        .map(a => [a.participantId, a])
    )
    const individualAssignmentMap = new Map(
      roomAssignments
        .filter(a => a.individualRegistrationId)
        .map(a => [a.individualRegistrationId, a])
    )

    // Format response
    const participants = [
      ...groupParticipants.map((p) => {
        const assignment = participantAssignmentMap.get(p.id)
        return {
          id: p.id,
          type: 'group' as const,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          isMinor: p.age !== null && p.age !== undefined ? p.age < 18 : false,
          parishName: p.groupRegistration?.parishName,
          groupRegistrationId: p.groupRegistrationId,
          roomAssignment: assignment
            ? {
                roomId: assignment.roomId,
                roomNumber: assignment.room.roomNumber,
                buildingName: assignment.room.building.name,
              }
            : null,
          roommatePreference: null,
        }
      }),
      ...individualRegistrations.map((r) => {
        const assignment = individualAssignmentMap.get(r.id)
        return {
          id: r.id,
          type: 'individual' as const,
          firstName: r.firstName,
          lastName: r.lastName,
          gender: r.gender,
          isMinor: r.age !== null && r.age !== undefined ? r.age < 18 : false,
          parishName: null,
          groupRegistrationId: null,
          roomAssignment: assignment
            ? {
                roomId: assignment.roomId,
                roomNumber: assignment.room.roomNumber,
                buildingName: assignment.room.building.name,
              }
            : null,
          roommatePreference: r.preferredRoommate || null,
        }
      }),
    ]

    return NextResponse.json(participants)
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return NextResponse.json(
      { message: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}
