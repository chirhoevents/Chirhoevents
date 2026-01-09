import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Meal Group Assignments POST]',
    })
    if (error) return error
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()

    const { mealGroupId, groupRegistrationId, individualRegistrationId } = body

    // Check if already assigned and update
    if (groupRegistrationId) {
      const existing = await prisma.mealGroupAssignment.findFirst({
        where: { groupRegistrationId },
      })
      if (existing) {
        // Update old group size
        await prisma.mealGroup.update({
          where: { id: existing.mealGroupId },
          data: { currentSize: { decrement: 1 } },
        })
        // Update assignment
        await prisma.mealGroupAssignment.update({
          where: { id: existing.id },
          data: { mealGroupId },
        })
        // Update new group size
        await prisma.mealGroup.update({
          where: { id: mealGroupId },
          data: { currentSize: { increment: 1 } },
        })
        return NextResponse.json({ updated: true })
      }
    }

    if (individualRegistrationId) {
      const existing = await prisma.mealGroupAssignment.findFirst({
        where: { individualRegistrationId },
      })
      if (existing) {
        await prisma.mealGroup.update({
          where: { id: existing.mealGroupId },
          data: { currentSize: { decrement: 1 } },
        })
        await prisma.mealGroupAssignment.update({
          where: { id: existing.id },
          data: { mealGroupId },
        })
        await prisma.mealGroup.update({
          where: { id: mealGroupId },
          data: { currentSize: { increment: 1 } },
        })
        return NextResponse.json({ updated: true })
      }
    }

    // Create assignment
    const assignment = await prisma.mealGroupAssignment.create({
      data: {
        mealGroupId,
        groupRegistrationId: groupRegistrationId || null,
        individualRegistrationId: individualRegistrationId || null,
        assignedBy: user.id,
      },
    })

    // Update group size
    await prisma.mealGroup.update({
      where: { id: mealGroupId },
      data: { currentSize: { increment: 1 } },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Failed to create meal group assignment:', error)
    return NextResponse.json(
      { message: 'Failed to create meal group assignment' },
      { status: 500 }
    )
  }
}
