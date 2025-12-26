import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const user = await requireAdmin()
    const { id } = params
    const body = await request.json().catch(() => ({}))
    const { type } = body

    let assignment
    if (type === 'group_registration' || type === 'youth_group') {
      // Find assignment by groupRegistrationId (youth group)
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: { groupRegistrationId: id },
      })
    } else if (type === 'individual') {
      // Find assignment by individualRegistrationId
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: { individualRegistrationId: id },
      })
    } else if (type === 'participant') {
      // Legacy: find by participantId
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: { participantId: id },
      })
    } else {
      // Try all options including direct assignment ID
      assignment = await prisma.smallGroupAssignment.findFirst({
        where: {
          OR: [
            { id },
            { groupRegistrationId: id },
            { individualRegistrationId: id },
            { participantId: id },
          ],
        },
      })
    }

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 })
    }

    const groupId = assignment.smallGroupId
    const isIndividualAssignment = assignment.participantId || assignment.individualRegistrationId

    await prisma.smallGroupAssignment.delete({
      where: { id: assignment.id },
    })

    // Update group size only for individual assignments (not youth groups)
    if (isIndividualAssignment) {
      await prisma.smallGroup.update({
        where: { id: groupId },
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
