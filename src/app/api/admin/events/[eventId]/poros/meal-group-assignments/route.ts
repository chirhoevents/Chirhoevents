import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
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
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[Meal Group Assignments POST] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const { mealGroupId, groupRegistrationId, individualRegistrationId } = body

    // Get participant count for group registrations
    let participantCount = 1 // Default for individual registrations
    if (groupRegistrationId) {
      const group = await prisma.groupRegistration.findUnique({
        where: { id: groupRegistrationId },
        select: { totalParticipants: true },
      })
      participantCount = group?.totalParticipants || 1
    }

    // Check if already assigned and update
    if (groupRegistrationId) {
      const existing = await prisma.mealGroupAssignment.findFirst({
        where: { groupRegistrationId },
      })
      if (existing) {
        // Update old group size (decrement by participant count)
        await prisma.mealGroup.update({
          where: { id: existing.mealGroupId },
          data: { currentSize: { decrement: participantCount } },
        })
        // Update assignment
        await prisma.mealGroupAssignment.update({
          where: { id: existing.id },
          data: { mealGroupId },
        })
        // Update new group size (increment by participant count)
        await prisma.mealGroup.update({
          where: { id: mealGroupId },
          data: { currentSize: { increment: participantCount } },
        })
        return NextResponse.json({ updated: true })
      }
    }

    if (individualRegistrationId) {
      const existing = await prisma.mealGroupAssignment.findFirst({
        where: { individualRegistrationId },
      })
      if (existing) {
        // Individual registrations count as 1
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

    // Update group size (increment by participant count)
    await prisma.mealGroup.update({
      where: { id: mealGroupId },
      data: { currentSize: { increment: participantCount } },
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
