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

    // Get all seating assignments for this event's registrations
    const seatingAssignments = await prisma.seatingAssignment.findMany({
      where: {
        OR: [
          { groupRegistrationId: { in: groupRegs.map(r => r.id) } },
          { individualRegistrationId: { in: individualRegs.map(r => r.id) } },
        ],
      },
      include: {
        section: true,
      },
    })

    // Create lookup maps
    const groupAssignmentMap = new Map(
      seatingAssignments
        .filter(a => a.groupRegistrationId)
        .map(a => [a.groupRegistrationId, a])
    )
    const individualAssignmentMap = new Map(
      seatingAssignments
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
          seatingAssignment: assignment
            ? {
                sectionId: assignment.sectionId,
                sectionName: assignment.section.name,
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
