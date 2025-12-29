import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = await params

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
    const user = await requireAdmin()
    const { eventId } = await params
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
