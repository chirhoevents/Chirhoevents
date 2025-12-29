import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface ParticipantRecord {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  age: number | null
  groupRegistrationId: string
  groupRegistration: { parishName: string | null } | null
}

interface IndividualRecord {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  age: number | null
  preferredRoommate: string | null
}

interface RoomAssignmentRecord {
  participantId: string | null
  individualRegistrationId: string | null
  roomId: string
  room: {
    roomNumber: string
    building: { name: string }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = await params

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
          { participantId: { in: groupParticipants.map((p: ParticipantRecord) => p.id) } },
          { individualRegistrationId: { in: individualRegistrations.map((r: IndividualRecord) => r.id) } },
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
        .filter((a: RoomAssignmentRecord) => a.participantId)
        .map((a: RoomAssignmentRecord) => [a.participantId, a])
    )
    const individualAssignmentMap = new Map(
      roomAssignments
        .filter((a: RoomAssignmentRecord) => a.individualRegistrationId)
        .map((a: RoomAssignmentRecord) => [a.individualRegistrationId, a])
    )

    // Format response
    const participants = [
      ...groupParticipants.map((p: ParticipantRecord) => {
        const assignment = participantAssignmentMap.get(p.id) as RoomAssignmentRecord | undefined
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
      ...individualRegistrations.map((r: IndividualRecord) => {
        const assignment = individualAssignmentMap.get(r.id) as RoomAssignmentRecord | undefined
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
