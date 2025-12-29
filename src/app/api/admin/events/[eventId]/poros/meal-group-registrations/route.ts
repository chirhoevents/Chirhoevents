import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface GroupRegistrationRecord {
  id: string
  parishName: string | null
  _count: { participants: number }
}

interface IndividualRegistrationRecord {
  id: string
  firstName: string
  lastName: string
}

interface MealGroupAssignmentRecord {
  groupRegistrationId: string | null
  individualRegistrationId: string | null
  mealGroupId: string
  mealGroup: {
    name: string
    colorHex: string | null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = await params

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
          { groupRegistrationId: { in: groupRegs.map((r: GroupRegistrationRecord) => r.id) } },
          { individualRegistrationId: { in: individualRegs.map((r: IndividualRegistrationRecord) => r.id) } },
        ],
      },
      include: {
        mealGroup: true,
      },
    })

    // Create lookup maps
    const groupAssignmentMap = new Map(
      mealGroupAssignments
        .filter((a: MealGroupAssignmentRecord) => a.groupRegistrationId)
        .map((a: MealGroupAssignmentRecord) => [a.groupRegistrationId, a])
    )
    const individualAssignmentMap = new Map(
      mealGroupAssignments
        .filter((a: MealGroupAssignmentRecord) => a.individualRegistrationId)
        .map((a: MealGroupAssignmentRecord) => [a.individualRegistrationId, a])
    )

    const registrations = [
      ...groupRegs.map((r: GroupRegistrationRecord) => {
        const assignment = groupAssignmentMap.get(r.id) as MealGroupAssignmentRecord | undefined
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
      ...individualRegs.map((r: IndividualRegistrationRecord) => {
        const assignment = individualAssignmentMap.get(r.id) as MealGroupAssignmentRecord | undefined
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
