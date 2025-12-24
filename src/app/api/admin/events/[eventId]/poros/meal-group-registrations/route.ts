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

    // Get group registrations
    const groupRegs = await prisma.groupRegistration.findMany({
      where: { eventId },
      include: {
        _count: { select: { participants: true } },
      },
    })

    // Get individual registrations
    const individualRegs = await prisma.individualRegistration.findMany({
      where: { eventId },
    })

    // Get all meal group assignments for this event's registrations
    const mealGroupAssignments = await prisma.mealGroupAssignment.findMany({
      where: {
        OR: [
          { groupRegistrationId: { in: groupRegs.map(r => r.id) } },
          { individualRegistrationId: { in: individualRegs.map(r => r.id) } },
        ],
      },
      include: {
        mealGroup: true,
      },
    })

    // Create lookup maps
    const groupAssignmentMap = new Map(
      mealGroupAssignments
        .filter(a => a.groupRegistrationId)
        .map(a => [a.groupRegistrationId, a])
    )
    const individualAssignmentMap = new Map(
      mealGroupAssignments
        .filter(a => a.individualRegistrationId)
        .map(a => [a.individualRegistrationId, a])
    )

    const registrations = [
      ...groupRegs.map(r => {
        const assignment = groupAssignmentMap.get(r.id)
        return {
          id: r.id,
          type: 'group' as const,
          name: r.parishName,
          participantCount: r._count.participants,
          mealGroupAssignment: assignment
            ? {
                groupId: assignment.mealGroupId,
                groupName: assignment.mealGroup.name,
                colorHex: assignment.mealGroup.colorHex,
              }
            : null,
        }
      }),
      ...individualRegs.map(r => {
        const assignment = individualAssignmentMap.get(r.id)
        return {
          id: r.id,
          type: 'individual' as const,
          name: `${r.firstName} ${r.lastName}`,
          participantCount: 1,
          mealGroupAssignment: assignment
            ? {
                groupId: assignment.mealGroupId,
                groupName: assignment.mealGroup.name,
                colorHex: assignment.mealGroup.colorHex,
              }
            : null,
        }
      }),
    ]

    return NextResponse.json(registrations)
  } catch (error) {
    console.error('Failed to fetch meal group registrations:', error)
    return NextResponse.json(
      { message: 'Failed to fetch meal group registrations' },
      { status: 500 }
    )
  }
}
