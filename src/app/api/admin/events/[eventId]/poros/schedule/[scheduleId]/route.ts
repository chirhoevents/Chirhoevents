import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Update a schedule entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; scheduleId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId } = await Promise.resolve(params)
    const body = await request.json()
    const { day, startTime, endTime, title, location } = body

    const entry = await prisma.porosScheduleEntry.update({
      where: { id: scheduleId },
      data: {
        day,
        startTime,
        endTime: endTime || null,
        title,
        location: location || null,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to update schedule entry:', error)
    return NextResponse.json({ error: 'Failed to update schedule entry' }, { status: 500 })
  }
}

// DELETE - Delete a schedule entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; scheduleId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId } = await Promise.resolve(params)

    await prisma.porosScheduleEntry.delete({
      where: { id: scheduleId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete schedule entry:', error)
    return NextResponse.json({ error: 'Failed to delete schedule entry' }, { status: 500 })
  }
}
