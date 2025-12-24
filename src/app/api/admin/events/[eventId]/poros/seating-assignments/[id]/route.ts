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
    if (type === 'group') {
      assignment = await prisma.seatingAssignment.findFirst({
        where: { groupRegistrationId: id },
      })
    } else if (type === 'individual') {
      assignment = await prisma.seatingAssignment.findFirst({
        where: { individualRegistrationId: id },
      })
    } else {
      assignment = await prisma.seatingAssignment.findFirst({
        where: {
          OR: [{ groupRegistrationId: id }, { individualRegistrationId: id }, { id }],
        },
      })
    }

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 })
    }

    const sectionId = assignment.sectionId

    await prisma.seatingAssignment.delete({
      where: { id: assignment.id },
    })

    // Update section occupancy
    const count = await prisma.seatingAssignment.count({
      where: { sectionId },
    })
    await prisma.seatingSection.update({
      where: { id: sectionId },
      data: { currentOccupancy: count },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete seating assignment:', error)
    return NextResponse.json(
      { message: 'Failed to delete seating assignment' },
      { status: 500 }
    )
  }
}
