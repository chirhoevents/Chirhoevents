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

    // Get participants with small group assignments
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: { eventId },
      },
      include: {
        groupRegistration: true,
        smallGroupAssignment: {
          include: { smallGroup: true },
        },
      },
    })

    // Get individual registrations with small group assignments
    const individuals = await prisma.individualRegistration.findMany({
      where: { eventId },
      include: {
        smallGroupAssignment: {
          include: { smallGroup: true },
        },
      },
    })

    const result = [
      ...participants.map(p => ({
        id: p.id,
        type: 'group' as const,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        parishName: p.groupRegistration?.parishName,
        smallGroupAssignment: p.smallGroupAssignment
          ? {
              groupId: p.smallGroupAssignment.smallGroupId,
              groupName: p.smallGroupAssignment.smallGroup.name,
            }
          : null,
      })),
      ...individuals.map(r => ({
        id: r.id,
        type: 'individual' as const,
        firstName: r.firstName,
        lastName: r.lastName,
        gender: r.gender,
        parishName: null,
        smallGroupAssignment: r.smallGroupAssignment
          ? {
              groupId: r.smallGroupAssignment.smallGroupId,
              groupName: r.smallGroupAssignment.smallGroup.name,
            }
          : null,
      })),
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
