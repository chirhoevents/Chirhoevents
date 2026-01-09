import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// PUT - Update a meal time
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; mealTimeId: string }> }
) {
  try {
    const { eventId, mealTimeId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Meal Time]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Meal Time] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, meal, color, time } = body

    const mealTime = await prisma.porosMealTime.update({
      where: { id: mealTimeId },
      data: {
        day,
        meal,
        color,
        time,
      },
    })

    return NextResponse.json(mealTime)
  } catch (error) {
    console.error('Failed to update meal time:', error)
    return NextResponse.json({ error: 'Failed to update meal time' }, { status: 500 })
  }
}

// DELETE - Delete a meal time
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; mealTimeId: string }> }
) {
  try {
    const { eventId, mealTimeId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Meal Time]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Meal Time] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosMealTime.delete({
      where: { id: mealTimeId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal time:', error)
    return NextResponse.json({ error: 'Failed to delete meal time' }, { status: 500 })
  }
}
