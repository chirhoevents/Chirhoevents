import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { type } = body

    let assignment
    if (type === 'group') {
      assignment = await prisma.mealGroupAssignment.findFirst({
        where: { groupRegistrationId: id },
      })
    } else if (type === 'individual') {
      assignment = await prisma.mealGroupAssignment.findFirst({
        where: { individualRegistrationId: id },
      })
    } else {
      assignment = await prisma.mealGroupAssignment.findFirst({
        where: {
          OR: [{ groupRegistrationId: id }, { individualRegistrationId: id }, { id }],
        },
      })
    }

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 })
    }

    const groupId = assignment.mealGroupId

    await prisma.mealGroupAssignment.delete({
      where: { id: assignment.id },
    })

    // Update group size
    await prisma.mealGroup.update({
      where: { id: groupId },
      data: { currentSize: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal group assignment:', error)
    return NextResponse.json(
      { message: 'Failed to delete meal group assignment' },
      { status: 500 }
    )
  }
}
