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
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/meal-groups/auto-assign]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    // Get active meal groups
    const mealGroups = await prisma.mealGroup.findMany({
      where: {
        eventId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    })

    if (mealGroups.length === 0) {
      return NextResponse.json(
        { message: 'No active meal groups available' },
        { status: 400 }
      )
    }

    // Get all group registrations for this event
    const allGroups = await prisma.groupRegistration.findMany({
      where: { eventId },
      orderBy: { groupName: 'asc' },
    })

    // Get existing meal group assignments for this event
    const existingAssignments = await prisma.mealGroupAssignment.findMany({
      where: {
        mealGroup: { eventId },
        groupRegistrationId: { not: null },
      },
      select: { groupRegistrationId: true },
    })

    const assignedGroupIds = new Set(
      existingAssignments.map((a) => a.groupRegistrationId).filter(Boolean)
    )

    // Filter to unassigned groups
    const unassignedGroups = allGroups.filter((g) => !assignedGroupIds.has(g.id))

    if (unassignedGroups.length === 0) {
      return NextResponse.json({
        assigned: 0,
        message: 'No unassigned groups to assign',
      })
    }

    // Separate meal groups by accommodation type
    const onCampusGroups = mealGroups.filter(
      (g) => g.accommodationType === 'on_campus' || g.accommodationType === 'all'
    )
    const offCampusGroups = mealGroups.filter(
      (g) => g.accommodationType === 'off_campus' || g.accommodationType === 'all'
    )

    // Track current size for each meal group
    const groupSizes = new Map<string, number>()
    mealGroups.forEach((g) => groupSizes.set(g.id, g.currentSize))

    // Helper to find best meal group for a registration
    const findBestMealGroup = (
      availableGroups: typeof mealGroups
    ): string | null => {
      if (availableGroups.length === 0) return null

      let smallestGroupId = availableGroups[0].id
      let smallestSize = groupSizes.get(availableGroups[0].id) || 0

      for (const mg of availableGroups) {
        const size = groupSizes.get(mg.id) || 0
        if (size < smallestSize) {
          smallestSize = size
          smallestGroupId = mg.id
        }
      }
      return smallestGroupId
    }

    // Distribute groups based on their housing type
    const assignments: {
      mealGroupId: string
      groupRegistrationId: string
    }[] = []

    for (const group of unassignedGroups) {
      // Determine which meal groups this registration can use based on housing type
      let eligibleMealGroups: typeof mealGroups

      // Check housing type of the group
      const isOnCampus =
        (group.onCampusYouth || 0) > 0 || (group.onCampusChaperones || 0) > 0
      const isOffCampus =
        (group.offCampusYouth || 0) > 0 || (group.offCampusChaperones || 0) > 0

      if (isOnCampus && !isOffCampus) {
        // Pure on-campus group
        eligibleMealGroups = onCampusGroups
      } else if (isOffCampus && !isOnCampus) {
        // Pure off-campus group
        eligibleMealGroups = offCampusGroups
      } else {
        // Mixed or unknown - use all meal groups
        eligibleMealGroups = mealGroups
      }

      // Fall back to all groups if no specific groups available
      if (eligibleMealGroups.length === 0) {
        eligibleMealGroups = mealGroups
      }

      const bestMealGroupId = findBestMealGroup(eligibleMealGroups)
      if (bestMealGroupId) {
        assignments.push({
          mealGroupId: bestMealGroupId,
          groupRegistrationId: group.id,
        })

        // Update tracked size (add participant count)
        groupSizes.set(
          bestMealGroupId,
          (groupSizes.get(bestMealGroupId) || 0) + group.totalParticipants
        )
      }
    }

    if (assignments.length === 0) {
      return NextResponse.json({
        assigned: 0,
        message: 'No groups could be assigned',
      })
    }

    // Create all assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // Create meal group assignments
      await tx.mealGroupAssignment.createMany({
        data: assignments,
      })

      // Update current sizes for each meal group
      for (const mg of mealGroups) {
        const assignedToThisGroup = assignments.filter(
          (a) => a.mealGroupId === mg.id
        )
        if (assignedToThisGroup.length > 0) {
          const additionalSize = unassignedGroups
            .filter((g) =>
              assignedToThisGroup.some((a) => a.groupRegistrationId === g.id)
            )
            .reduce((sum, g) => sum + g.totalParticipants, 0)

          await tx.mealGroup.update({
            where: { id: mg.id },
            data: {
              currentSize: mg.currentSize + additionalSize,
            },
          })
        }
      }
    })

    return NextResponse.json({
      assigned: assignments.length,
      message: `Successfully assigned ${assignments.length} groups to meal colors`,
    })
  } catch (error) {
    console.error('Failed to auto-assign meal groups:', error)
    return NextResponse.json(
      { message: 'Failed to auto-assign meal groups' },
      { status: 500 }
    )
  }
}
