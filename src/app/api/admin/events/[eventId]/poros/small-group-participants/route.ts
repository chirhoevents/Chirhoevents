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
          { participantId: { in: participants.map(p => p.id) } },
          { individualRegistrationId: { in: individuals.map(r => r.id) } },
        ],
      },
      include: {
        smallGroup: true,
      },
    })

    // Create lookup maps
    const participantAssignmentMap = new Map(
      smallGroupAssignments
        .filter(a => a.participantId)
        .map(a => [a.participantId, a])
    )
    const individualAssignmentMap = new Map(
      smallGroupAssignments
        .filter(a => a.individualRegistrationId)
        .map(a => [a.individualRegistrationId, a])
    )

    const result = [
      ...participants.map(p => {
        const assignment = participantAssignmentMap.get(p.id)
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
      ...individuals.map(r => {
        const assignment = individualAssignmentMap.get(r.id)
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
