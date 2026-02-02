import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
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
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET ADA Participants]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET ADA Participants] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Track all results by a unique key to avoid duplicates
    const resultsMap = new Map<string, {
      id: string
      type: 'participant' | 'individual'
      firstName: string
      lastName: string
      adaDescription: string | null
      groupName: string | null
      assigned: boolean
      buildingName?: string
      roomNumber?: string
    }>()

    // === Source 1: AdaIndividual table (manually tracked ADA records) ===
    const adaIndividuals = await prisma.adaIndividual.findMany({
      where: { eventId: eventId }
    })

    const adaParticipantIds = adaIndividuals
      .filter((a: AdaIndividualRecord) => a.participantId)
      .map((a: AdaIndividualRecord) => a.participantId!)

    const adaIndividualIds = adaIndividuals
      .filter((a: AdaIndividualRecord) => a.individualRegistrationId)
      .map((a: AdaIndividualRecord) => a.individualRegistrationId!)

    // === Source 2: Liability forms with adaAccommodations filled in ===
    const liabilityFormsWithAda = await prisma.liabilityForm.findMany({
      where: {
        eventId,
        completed: true,
        adaAccommodations: { not: null },
        NOT: { adaAccommodations: '' },
      },
      select: {
        participantId: true,
        participantFirstName: true,
        participantLastName: true,
        adaAccommodations: true,
        groupRegistration: {
          select: { groupName: true }
        },
      },
    })

    // === Source 3: Individual registrations with adaAccommodations filled in ===
    const individualRegsWithAda = await prisma.individualRegistration.findMany({
      where: {
        eventId,
        adaAccommodations: { not: null },
        NOT: { adaAccommodations: '' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        adaAccommodations: true,
      },
    })

    // Collect all participant/individual IDs we need room assignments for
    const allParticipantIds = new Set<string>(adaParticipantIds)
    const allIndividualIds = new Set<string>(adaIndividualIds)

    for (const form of liabilityFormsWithAda) {
      if (form.participantId) allParticipantIds.add(form.participantId)
    }
    for (const reg of individualRegsWithAda) {
      allIndividualIds.add(reg.id)
    }

    // Query participants referenced by AdaIndividual table (for name/group lookup)
    const adaParticipants: ParticipantWithGroup[] = adaParticipantIds.length > 0
      ? await prisma.participant.findMany({
          where: { id: { in: adaParticipantIds } },
          include: {
            groupRegistration: {
              select: { groupName: true }
            }
          }
        })
      : []

    const adaIndividualRegs: IndividualRegistrationRecord[] = adaIndividualIds.length > 0
      ? await prisma.individualRegistration.findMany({
          where: { id: { in: adaIndividualIds } }
        })
      : []

    // Build room assignment lookups for all relevant IDs
    const orConditions: Array<{ participantId?: { in: string[] }; individualRegistrationId?: { in: string[] } }> = []
    if (allParticipantIds.size > 0) {
      orConditions.push({ participantId: { in: [...allParticipantIds] } })
    }
    if (allIndividualIds.size > 0) {
      orConditions.push({ individualRegistrationId: { in: [...allIndividualIds] } })
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

    // Create lookup maps for AdaIndividual-referenced records
    const participantMap = new Map<string, ParticipantWithGroup>(
      adaParticipants.map((p: ParticipantWithGroup) => [p.id, p])
    )
    const individualMap = new Map<string, IndividualRegistrationRecord>(
      adaIndividualRegs.map((i: IndividualRegistrationRecord) => [i.id, i])
    )

    // Add results from AdaIndividual table
    for (const ada of adaIndividuals) {
      if (ada.participantId) {
        const participant = participantMap.get(ada.participantId)
        if (!participant) continue
        const assignment = participantAssignmentMap.get(ada.participantId)
        resultsMap.set(`participant-${ada.participantId}`, {
          id: ada.participantId,
          type: 'participant',
          firstName: participant.firstName,
          lastName: participant.lastName,
          adaDescription: ada.accessibilityNeed,
          groupName: participant.groupRegistration?.groupName || null,
          assigned: !!assignment,
          buildingName: assignment?.room.building.name,
          roomNumber: assignment?.room.roomNumber,
        })
      } else if (ada.individualRegistrationId) {
        const individual = individualMap.get(ada.individualRegistrationId)
        if (!individual) continue
        const assignment = individualAssignmentMap.get(ada.individualRegistrationId)
        resultsMap.set(`individual-${ada.individualRegistrationId}`, {
          id: ada.individualRegistrationId,
          type: 'individual',
          firstName: individual.firstName,
          lastName: individual.lastName,
          adaDescription: ada.accessibilityNeed,
          groupName: null,
          assigned: !!assignment,
          buildingName: assignment?.room.building.name,
          roomNumber: assignment?.room.roomNumber,
        })
      }
    }

    // Add results from liability forms (skip if already added from AdaIndividual)
    for (const form of liabilityFormsWithAda) {
      if (!form.participantId) continue
      const key = `participant-${form.participantId}`
      if (resultsMap.has(key)) continue
      const assignment = participantAssignmentMap.get(form.participantId)
      resultsMap.set(key, {
        id: form.participantId,
        type: 'participant',
        firstName: form.participantFirstName,
        lastName: form.participantLastName,
        adaDescription: form.adaAccommodations,
        groupName: form.groupRegistration?.groupName || null,
        assigned: !!assignment,
        buildingName: assignment?.room.building.name,
        roomNumber: assignment?.room.roomNumber,
      })
    }

    // Add results from individual registrations (skip if already added)
    for (const reg of individualRegsWithAda) {
      const key = `individual-${reg.id}`
      if (resultsMap.has(key)) continue
      const assignment = individualAssignmentMap.get(reg.id)
      resultsMap.set(key, {
        id: reg.id,
        type: 'individual',
        firstName: reg.firstName,
        lastName: reg.lastName,
        adaDescription: reg.adaAccommodations,
        groupName: null,
        assigned: !!assignment,
        buildingName: assignment?.room.building.name,
        roomNumber: assignment?.room.roomNumber,
      })
    }

    const results = [...resultsMap.values()]
    return NextResponse.json(results)
  } catch (error) {
    console.error('ADA participants fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ADA participants' }, { status: 500 })
  }
}
