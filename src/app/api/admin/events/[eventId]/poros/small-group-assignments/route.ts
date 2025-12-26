import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const body = await request.json()

    const { smallGroupId, participantId, individualRegistrationId, groupRegistrationId } = body

    // Check group exists
    const group = await prisma.smallGroup.findUnique({
      where: { id: smallGroupId },
    })

    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    // Check if already assigned
    if (participantId) {
      const existing = await prisma.smallGroupAssignment.findFirst({
        where: { participantId },
      })
      if (existing) {
        return NextResponse.json(
          { message: 'Participant already assigned to a group' },
          { status: 400 }
        )
      }
    }

    if (individualRegistrationId) {
      const existing = await prisma.smallGroupAssignment.findFirst({
        where: { individualRegistrationId },
      })
      if (existing) {
        return NextResponse.json(
          { message: 'Individual already assigned to a group' },
          { status: 400 }
        )
      }
    }

    if (groupRegistrationId) {
      const existing = await prisma.smallGroupAssignment.findFirst({
        where: { groupRegistrationId },
      })
      if (existing) {
        return NextResponse.json(
          { message: 'Youth group already assigned to a small group' },
          { status: 400 }
        )
      }
    }

    // Create assignment
    const assignment = await prisma.smallGroupAssignment.create({
      data: {
        smallGroupId,
        participantId: participantId || null,
        individualRegistrationId: individualRegistrationId || null,
        groupRegistrationId: groupRegistrationId || null,
        assignedBy: user.id,
      },
    })

    // Update group size (only for individual assignments, not group registrations)
    if (participantId || individualRegistrationId) {
      await prisma.smallGroup.update({
        where: { id: smallGroupId },
        data: { currentSize: { increment: 1 } },
      })
    }

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Failed to create small group assignment:', error)
    return NextResponse.json(
      { message: 'Failed to create small group assignment' },
      { status: 500 }
    )
  }
}
