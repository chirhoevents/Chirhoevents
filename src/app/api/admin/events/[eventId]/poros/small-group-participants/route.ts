import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

interface ParticipantRecord {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  groupRegistration: { parishName: string | null } | null
}

interface IndividualRecord {
  id: string
  firstName: string
  lastName: string
  gender: string | null
}

interface SmallGroupAssignmentRecord {
  participantId: string | null
  individualRegistrationId: string | null
  smallGroupId: string
  smallGroup: { name: string }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET /api/admin/events/[eventId]/poros/small-group-participants]',
    })
    if (error) return error

    // Get participants
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: { eventId },
      },
      include: {
        groupRegistration: true,
      },
    })

    // Get individual registrations
    const individuals = await prisma.individualRegistration.findMany({
      where: { eventId },
    })

    // Get all small group assignments
    const smallGroupAssignments = await prisma.smallGroupAssignment.findMany({
      where: {
        OR: [
          { participantId: { in: participants.map((p: ParticipantRecord) => p.id) } },
          { individualRegistrationId: { in: individuals.map((r: IndividualRecord) => r.id) } },
        ],
      },
      include: {
        smallGroup: true,
      },
    })

    // Create lookup maps
    const participantAssignmentMap = new Map(
      smallGroupAssignments
        .filter((a: SmallGroupAssignmentRecord) => a.participantId)
        .map((a: SmallGroupAssignmentRecord) => [a.participantId, a])
    )
    const individualAssignmentMap = new Map(
      smallGroupAssignments
        .filter((a: SmallGroupAssignmentRecord) => a.individualRegistrationId)
        .map((a: SmallGroupAssignmentRecord) => [a.individualRegistrationId, a])
    )

    const result = [
      ...participants.map((p: ParticipantRecord) => {
        const assignment = participantAssignmentMap.get(p.id) as SmallGroupAssignmentRecord | undefined
        return {
          id: p.id,
          type: 'group' as const,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          parishName: p.groupRegistration?.parishName,
          smallGroupAssignment: assignment
            ? {
                groupId: assignment.smallGroupId,
                groupName: assignment.smallGroup.name,
              }
            : null,
        }
      }),
      ...individuals.map((r: IndividualRecord) => {
        const assignment = individualAssignmentMap.get(r.id) as SmallGroupAssignmentRecord | undefined
        return {
          id: r.id,
          type: 'individual' as const,
          firstName: r.firstName,
          lastName: r.lastName,
          gender: r.gender,
          parishName: null,
          smallGroupAssignment: assignment
            ? {
                groupId: assignment.smallGroupId,
                groupName: assignment.smallGroup.name,
              }
            : null,
        }
      }),
    ]

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch small group participants:', error)
    return NextResponse.json(
      { message: 'Failed to fetch small group participants' },
      { status: 500 }
    )
  }
}
