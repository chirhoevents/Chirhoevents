import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
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

interface SeatingAssignmentRecord {
  groupRegistrationId: string | null
  individualRegistrationId: string | null
  sectionId: string
  section: {
    name: string
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
      logPrefix: '[GET Seating Registrations]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Seating Registrations] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

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

    // Get all seating assignments for this event's registrations
    const seatingAssignments = await prisma.seatingAssignment.findMany({
      where: {
        OR: [
          { groupRegistrationId: { in: groupRegs.map((r: GroupRegistrationRecord) => r.id) } },
          { individualRegistrationId: { in: individualRegs.map((r: IndividualRegistrationRecord) => r.id) } },
        ],
      },
      include: {
        section: true,
      },
    })

    // Create lookup maps
    const groupAssignmentMap = new Map(
      seatingAssignments
        .filter((a: SeatingAssignmentRecord) => a.groupRegistrationId)
        .map((a: SeatingAssignmentRecord) => [a.groupRegistrationId, a])
    )
    const individualAssignmentMap = new Map(
      seatingAssignments
        .filter((a: SeatingAssignmentRecord) => a.individualRegistrationId)
        .map((a: SeatingAssignmentRecord) => [a.individualRegistrationId, a])
    )

    const registrations = [
      ...groupRegs.map((r: GroupRegistrationRecord) => {
        const assignment = groupAssignmentMap.get(r.id) as SeatingAssignmentRecord | undefined
        return {
          id: r.id,
          type: 'group' as const,
          name: r.parishName,
          participantCount: r._count.participants,
          seatingAssignment: assignment
            ? {
                sectionId: assignment.sectionId,
                sectionName: assignment.section.name,
              }
            : null,
        }
      }),
      ...individualRegs.map((r: IndividualRegistrationRecord) => {
        const assignment = individualAssignmentMap.get(r.id) as SeatingAssignmentRecord | undefined
        return {
          id: r.id,
          type: 'individual' as const,
          name: `${r.firstName} ${r.lastName}`,
          participantCount: 1,
          seatingAssignment: assignment
            ? {
                sectionId: assignment.sectionId,
                sectionName: assignment.section.name,
              }
            : null,
        }
      }),
    ]

    return NextResponse.json(registrations)
  } catch (error) {
    console.error('Failed to fetch seating registrations:', error)
    return NextResponse.json(
      { message: 'Failed to fetch seating registrations' },
      { status: 500 }
    )
  }
}
