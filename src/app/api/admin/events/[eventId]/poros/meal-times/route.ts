import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all meal times for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let mealTimes: any[] = []
    try {
      mealTimes = await prisma.porosMealTime.findMany({
        where: { eventId },
        orderBy: [{ day: 'asc' }, { meal: 'asc' }, { color: 'asc' }]
      })
    } catch (error) {
      console.error('Meal times table might not exist:', error)
    }

    // Get active meal groups/colors
    let mealGroups: any[] = []
    try {
      mealGroups = await prisma.mealGroup.findMany({
        where: { eventId, isActive: true },
        orderBy: { displayOrder: 'asc' }
      })
    } catch (error) {
      console.error('Meal groups table might not exist:', error)
    }

    return NextResponse.json({ mealTimes, mealGroups })
  } catch (error) {
    console.error('Failed to fetch meal times:', error)
    return NextResponse.json({ error: 'Failed to fetch meal times' }, { status: 500 })
  }
}

// POST - Create or update meal times
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { day, dayDate, meal, color, time } = body

    if (!day || !meal || !color || !time) {
      return NextResponse.json(
        { error: 'Day, meal, color, and time are required' },
        { status: 400 }
      )
    }

    // Upsert the meal time
    const mealTime = await prisma.porosMealTime.upsert({
      where: {
        unique_meal_time: {
          eventId: eventId,
          day,
          meal,
          color
        }
      },
      create: {
        eventId: eventId,
        day,
        dayDate: dayDate ? new Date(dayDate) : null,
        meal,
        color,
        time
      },
      update: {
        time,
        dayDate: dayDate ? new Date(dayDate) : null
      }
    })

    return NextResponse.json(mealTime)
  } catch (error) {
    console.error('Failed to save meal time:', error)
    return NextResponse.json({ error: 'Failed to save meal time' }, { status: 500 })
  }
}

// PUT - Bulk update meal times
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mealTimes } = body

    if (!Array.isArray(mealTimes)) {
      return NextResponse.json({ error: 'mealTimes array required' }, { status: 400 })
    }

    // Delete existing meal times for this event
    await prisma.porosMealTime.deleteMany({
      where: { eventId: eventId }
    })

    // Create new meal times
    if (mealTimes.length > 0) {
      await prisma.porosMealTime.createMany({
        data: mealTimes.map((mt: any, index: number) => ({
          eventId: eventId,
          day: mt.day,
          dayDate: mt.dayDate ? new Date(mt.dayDate) : null,
          meal: mt.meal,
          color: mt.color,
          time: mt.time,
          order: mt.order ?? index
        }))
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update meal times:', error)
    return NextResponse.json({ error: 'Failed to update meal times' }, { status: 500 })
  }
}

// DELETE - Delete a specific meal time or all
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      await prisma.porosMealTime.delete({
        where: { id }
      })
    } else {
      await prisma.porosMealTime.deleteMany({
        where: { eventId }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal times:', error)
    return NextResponse.json({ error: 'Failed to delete meal times' }, { status: 500 })
  }
}
