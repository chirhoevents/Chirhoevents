import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface AdaIndividualRecord {
  id: string
  participantId: string | null
  individualRegistrationId: string | null
  accessibilityNeed: string
}

interface ParticipantWithGroup {
  id: string
  firstName: string
  lastName: string
  groupRegistration: { groupName: string } | null
}

interface IndividualRegistrationRecord {
  id: string
  firstName: string
  lastName: string
}

interface RoomAssignmentWithRoom {
  participantId: string | null
  individualRegistrationId: string | null
  room: {
    roomNumber: string
    building: { name: string }
  }
}

// GET - List all participants with ADA needs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query AdaIndividual without relations (they're not defined in schema)
    const adaIndividuals = await prisma.adaIndividual.findMany({
      where: { eventId: eventId }
    })

    // Extract IDs for separate queries
    const participantIds = adaIndividuals
      .filter((a: AdaIndividualRecord) => a.participantId)
      .map((a: AdaIndividualRecord) => a.participantId!)

    const individualIds = adaIndividuals
      .filter((a: AdaIndividualRecord) => a.individualRegistrationId)
      .map((a: AdaIndividualRecord) => a.individualRegistrationId!)

    // Query participants and individuals separately
    const participants: ParticipantWithGroup[] = participantIds.length > 0
      ? await prisma.participant.findMany({
          where: { id: { in: participantIds } },
          include: {
            groupRegistration: {
              select: { groupName: true }
            }
          }
        })
      : []

    const individuals: IndividualRegistrationRecord[] = individualIds.length > 0
      ? await prisma.individualRegistration.findMany({
          where: { id: { in: individualIds } }
        })
      : []

    // Build room assignment query
    const orConditions: Array<{ participantId?: { in: string[] }; individualRegistrationId?: { in: string[] } }> = []
    if (participantIds.length > 0) {
      orConditions.push({ participantId: { in: participantIds } })
    }
    if (individualIds.length > 0) {
      orConditions.push({ individualRegistrationId: { in: individualIds } })
    }

    const roomAssignments: RoomAssignmentWithRoom[] = orConditions.length > 0
      ? await prisma.roomAssignment.findMany({
          where: { OR: orConditions },
          include: {
            room: {
              include: {
                building: { select: { name: true } }
              }
            }
          }
        })
      : []

    // Create lookup maps
    const participantMap = new Map<string, ParticipantWithGroup>(
      participants.map((p: ParticipantWithGroup) => [p.id, p])
    )
    const individualMap = new Map<string, IndividualRegistrationRecord>(
      individuals.map((i: IndividualRegistrationRecord) => [i.id, i])
    )
    const participantAssignmentMap = new Map<string, RoomAssignmentWithRoom>(
      roomAssignments
        .filter((a: RoomAssignmentWithRoom) => a.participantId)
        .map((a: RoomAssignmentWithRoom) => [a.participantId!, a])
    )
    const individualAssignmentMap = new Map<string, RoomAssignmentWithRoom>(
      roomAssignments
        .filter((a: RoomAssignmentWithRoom) => a.individualRegistrationId)
        .map((a: RoomAssignmentWithRoom) => [a.individualRegistrationId!, a])
    )

    // Format the response
    const results = adaIndividuals.map((ada: AdaIndividualRecord) => {
      if (ada.participantId) {
        const participant = participantMap.get(ada.participantId)
        if (!participant) return null
        const assignment = participantAssignmentMap.get(ada.participantId)
        return {
          id: ada.participantId,
          type: 'participant' as const,
          firstName: participant.firstName,
          lastName: participant.lastName,
          adaDescription: ada.accessibilityNeed,
          groupName: participant.groupRegistration?.groupName || null,
          assigned: !!assignment,
          buildingName: assignment?.room.building.name,
          roomNumber: assignment?.room.roomNumber,
        }
      } else if (ada.individualRegistrationId) {
        const individual = individualMap.get(ada.individualRegistrationId)
        if (!individual) return null
        const assignment = individualAssignmentMap.get(ada.individualRegistrationId)
        return {
          id: ada.individualRegistrationId,
          type: 'individual' as const,
          firstName: individual.firstName,
          lastName: individual.lastName,
          adaDescription: ada.accessibilityNeed,
          groupName: null,
          assigned: !!assignment,
          buildingName: assignment?.room.building.name,
          roomNumber: assignment?.room.roomNumber,
        }
      }
      return null
    }).filter(Boolean)

    return NextResponse.json(results)
  } catch (error) {
    console.error('ADA participants fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ADA participants' }, { status: 500 })
  }
}
