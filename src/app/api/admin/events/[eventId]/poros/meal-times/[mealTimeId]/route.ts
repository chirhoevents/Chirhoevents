import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Update a meal time
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; mealTimeId: string }> }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mealTimeId } = await Promise.resolve(params)
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
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mealTimeId } = await Promise.resolve(params)

    await prisma.porosMealTime.delete({
      where: { id: mealTimeId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal time:', error)
    return NextResponse.json({ error: 'Failed to delete meal time' }, { status: 500 })
  }
}
