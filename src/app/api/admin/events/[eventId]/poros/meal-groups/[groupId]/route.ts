import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string; groupId: string } }
) {
  try {
    const user = await requireAdmin()
    const { groupId } = params
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
  { params }: { params: { eventId: string; groupId: string } }
) {
  try {
    const user = await requireAdmin()
    const { groupId } = params

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
