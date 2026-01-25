import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const { eventId, id } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Meal Group Assignment DELETE]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Meal Group Assignment DELETE] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
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

    // Get participant count for group registrations
    let participantCount = 1 // Default for individual registrations
    if (assignment.groupRegistrationId) {
      const group = await prisma.groupRegistration.findUnique({
        where: { id: assignment.groupRegistrationId },
        select: { totalParticipants: true },
      })
      participantCount = group?.totalParticipants || 1
    }

    await prisma.mealGroupAssignment.delete({
      where: { id: assignment.id },
    })

    // Update group size (decrement by participant count)
    await prisma.mealGroup.update({
      where: { id: groupId },
      data: { currentSize: { decrement: participantCount } },
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
