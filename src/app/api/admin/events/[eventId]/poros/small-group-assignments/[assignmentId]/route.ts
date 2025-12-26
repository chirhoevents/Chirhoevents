import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// DELETE - Remove a small group assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; assignmentId: string } }
) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { type } = body

    // The assignmentId could be the actual assignment ID or the entity ID (groupRegistrationId, individualRegistrationId)
    // based on the type parameter

    let assignment = null

    if (type === 'group_registration') {
      // Find assignment by groupRegistrationId
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: { groupRegistrationId: params.assignmentId },
      })
    } else if (type === 'individual') {
      // Find assignment by individualRegistrationId
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: { individualRegistrationId: params.assignmentId },
      })
    } else if (type === 'group' || type === 'participant') {
      // Find assignment by participantId (legacy support)
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: { participantId: params.assignmentId },
      })
    } else {
      // Try to find by assignment ID directly
      assignment = await prisma.smallGroupAssignment.findUnique({
        where: { id: params.assignmentId },
      })
    }

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 })
    }

    // Delete the assignment
    await prisma.smallGroupAssignment.delete({
      where: { id: assignment.id },
    })

    // Decrement group size only for individual assignments
    if (assignment.participantId || assignment.individualRegistrationId) {
      await prisma.smallGroup.update({
        where: { id: assignment.smallGroupId },
        data: { currentSize: { decrement: 1 } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete small group assignment:', error)
    return NextResponse.json(
      { message: 'Failed to delete small group assignment' },
      { status: 500 }
    )
  }
}
