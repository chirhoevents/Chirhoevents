import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface GroupRegistrationRecord {
  id: string
  parishName: string | null
  groupCode: string | null
  onCampusYouth: number | null
  onCampusChaperones: number | null
  offCampusYouth: number | null
  offCampusChaperones: number | null
  totalParticipants: number
  _count: { participants: number }
}

function getAccommodationType(r: GroupRegistrationRecord): 'on_campus' | 'off_campus' | 'mixed' {
  const isOnCampus = (r.onCampusYouth || 0) > 0 || (r.onCampusChaperones || 0) > 0
  const isOffCampus = (r.offCampusYouth || 0) > 0 || (r.offCampusChaperones || 0) > 0

  if (isOnCampus && isOffCampus) return 'mixed'
  if (isOnCampus) return 'on_campus'
  if (isOffCampus) return 'off_campus'
  return 'on_campus' // Default
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
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Meal Group Registrations GET]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Meal Group Registrations GET] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get group registrations
    const groupRegs = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        parishName: true,
        groupCode: true,
        onCampusYouth: true,
        onCampusChaperones: true,
        offCampusYouth: true,
        offCampusChaperones: true,
        totalParticipants: true,
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
          groupCode: r.groupCode,
          participantCount: r.totalParticipants || r._count.participants,
          accommodationType: getAccommodationType(r),
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
          groupCode: null,
          participantCount: 1,
          accommodationType: 'on_campus' as const, // Individuals default to on-campus
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
