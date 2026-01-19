import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT /api/admin/events/[eventId]/poros/meal-groups/[groupId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Meal Group] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const group = await prisma.mealGroup.update({
      where: { id: groupId },
      data: {
        name: body.name,
        color: body.color,
        colorHex: body.colorHex,
        breakfastTime: body.breakfastTime,
        lunchTime: body.lunchTime,
        dinnerTime: body.dinnerTime,
        sundayBreakfastTime: body.sundayBreakfastTime,
        capacity: body.capacity,
        isActive: body.isActive,
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Failed to update meal group:', error)
    return NextResponse.json(
      { message: 'Failed to update meal group' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/meal-groups/[groupId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Meal Group] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.mealGroup.delete({
      where: { id: groupId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal group:', error)
    return NextResponse.json(
      { message: 'Failed to delete meal group' },
      { status: 500 }
    )
  }
}
