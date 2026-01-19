import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET /api/admin/events/[eventId]/poros/meal-groups]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Meal Groups] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const groups = await prisma.mealGroup.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Failed to fetch meal groups:', error)
    return NextResponse.json(
      { message: 'Failed to fetch meal groups' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/meal-groups]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Meal Groups] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const group = await prisma.mealGroup.create({
      data: {
        eventId,
        name: body.name,
        color: body.color,
        colorHex: body.colorHex,
        breakfastTime: body.breakfastTime || null,
        lunchTime: body.lunchTime || null,
        dinnerTime: body.dinnerTime || null,
        sundayBreakfastTime: body.sundayBreakfastTime || null,
        capacity: body.capacity || 100,
        displayOrder: body.displayOrder || 0,
        isActive: body.isActive ?? true,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Failed to create meal group:', error)
    return NextResponse.json(
      { message: 'Failed to create meal group' },
      { status: 500 }
    )
  }
}
