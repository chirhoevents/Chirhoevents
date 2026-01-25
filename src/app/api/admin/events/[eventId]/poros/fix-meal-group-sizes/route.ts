import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// POST /api/admin/events/[eventId]/poros/fix-meal-group-sizes
// One-time fix to recalculate meal group currentSize based on actual participant counts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/fix-meal-group-sizes]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get all meal groups for this event
    const mealGroups = await prisma.mealGroup.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        currentSize: true,
      },
    })

    // Get all meal group assignments with participant counts
    const assignments = await prisma.mealGroupAssignment.findMany({
      where: {
        mealGroup: { eventId },
      },
      select: {
        mealGroupId: true,
        groupRegistrationId: true,
        individualRegistrationId: true,
      },
    })

    // Get participant counts for all group registrations
    const groupRegIds = assignments
      .filter(a => a.groupRegistrationId)
      .map(a => a.groupRegistrationId!)

    const groupRegs = await prisma.groupRegistration.findMany({
      where: { id: { in: groupRegIds } },
      select: {
        id: true,
        totalParticipants: true,
      },
    })

    const groupParticipantMap = new Map(
      groupRegs.map(g => [g.id, g.totalParticipants])
    )

    // Calculate correct size for each meal group
    const mealGroupSizes = new Map<string, number>()
    for (const assignment of assignments) {
      const currentSize = mealGroupSizes.get(assignment.mealGroupId) || 0

      if (assignment.groupRegistrationId) {
        // Add participant count for group registrations
        const participantCount = groupParticipantMap.get(assignment.groupRegistrationId) || 1
        mealGroupSizes.set(assignment.mealGroupId, currentSize + participantCount)
      } else if (assignment.individualRegistrationId) {
        // Individual registrations count as 1
        mealGroupSizes.set(assignment.mealGroupId, currentSize + 1)
      }
    }

    // Update all meal groups with calculated sizes
    const updates: { mealGroupId: string; name: string; oldSize: number; newSize: number }[] = []

    for (const mealGroup of mealGroups) {
      const newSize = mealGroupSizes.get(mealGroup.id) || 0

      if (mealGroup.currentSize !== newSize) {
        await prisma.mealGroup.update({
          where: { id: mealGroup.id },
          data: { currentSize: newSize },
        })

        updates.push({
          mealGroupId: mealGroup.id,
          name: mealGroup.name,
          oldSize: mealGroup.currentSize,
          newSize,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} meal groups`,
      updates,
    })
  } catch (error) {
    console.error('Error fixing meal group sizes:', error)
    return NextResponse.json(
      { error: 'Failed to fix meal group sizes' },
      { status: 500 }
    )
  }
}
