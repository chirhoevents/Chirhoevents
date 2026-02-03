import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - List all confession times for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Confession Times]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    let confessionTimes: any[] = []
    try {
      confessionTimes = await prisma.porosConfessionTime.findMany({
        where: { eventId },
        orderBy: [{ day: 'asc' }, { order: 'asc' }, { startTime: 'asc' }],
      })
    } catch (error) {
      console.error('Confession times table might not exist:', error)
    }

    return NextResponse.json({ confessionTimes })
  } catch (error) {
    console.error('Failed to fetch confession times:', error)
    return NextResponse.json({ error: 'Failed to fetch confession times' }, { status: 500 })
  }
}

// POST - Create a new confession time
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Confession Time]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, dayDate, startTime, endTime, location, confessor } = body

    if (!day || !startTime) {
      return NextResponse.json(
        { error: 'Day and start time are required' },
        { status: 400 }
      )
    }

    // Get max order for the day
    const maxOrder = await prisma.porosConfessionTime.aggregate({
      where: { eventId, day },
      _max: { order: true },
    })

    const entry = await prisma.porosConfessionTime.create({
      data: {
        eventId,
        day,
        dayDate: dayDate ? new Date(dayDate) : null,
        startTime,
        endTime: endTime || null,
        location: location || null,
        confessor: confessor || null,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Failed to create confession time:', error)
    return NextResponse.json({ error: 'Failed to create confession time' }, { status: 500 })
  }
}

// DELETE - Delete all confession times for an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Confession Times]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosConfessionTime.deleteMany({
      where: { eventId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession times:', error)
    return NextResponse.json({ error: 'Failed to delete confession times' }, { status: 500 })
  }
}
