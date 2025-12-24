import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all participants with ADA needs
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check AdaIndividual table first (from liability forms)
    const adaIndividuals = await prisma.adaIndividual.findMany({
      where: { eventId: params.eventId },
      include: {
        participant: {
          include: {
            groupRegistration: {
              select: { groupName: true }
            }
          }
        },
        individualRegistration: true
      }
    })

    // Get room assignments for these individuals
    const participantIds = adaIndividuals
      .filter(a => a.participantId)
      .map(a => a.participantId!)

    const individualIds = adaIndividuals
      .filter(a => a.individualRegistrationId)
      .map(a => a.individualRegistrationId!)

    const roomAssignments = await prisma.roomAssignment.findMany({
      where: {
        OR: [
          { participantId: { in: participantIds } },
          { individualRegistrationId: { in: individualIds } }
        ]
      },
      include: {
        room: {
          include: {
            building: { select: { name: true } }
          }
        }
      }
    })

    // Create lookup maps for assignments
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

    // Format the response
    const results = adaIndividuals.map(ada => {
      if (ada.participant) {
        const assignment = participantAssignmentMap.get(ada.participantId!)
        return {
          id: ada.participantId!,
          type: 'participant' as const,
          firstName: ada.participant.firstName,
          lastName: ada.participant.lastName,
          adaDescription: ada.adaDescription,
          groupName: ada.participant.groupRegistration?.groupName || null,
          assigned: !!assignment,
          buildingName: assignment?.room.building.name,
          roomNumber: assignment?.room.roomNumber,
        }
      } else if (ada.individualRegistration) {
        const assignment = individualAssignmentMap.get(ada.individualRegistrationId!)
        return {
          id: ada.individualRegistrationId!,
          type: 'individual' as const,
          firstName: ada.individualRegistration.firstName,
          lastName: ada.individualRegistration.lastName,
          adaDescription: ada.adaDescription,
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
