import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - List all adoration time slots for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Adoration]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    let adorations: any[] = []
    try {
      adorations = await prisma.porosAdoration.findMany({
        where: { eventId },
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }, { order: 'asc' }]
      })
    } catch (error) {
      console.error('Adoration table might not exist:', error)
    }

    return NextResponse.json({ adorations })
  } catch (error) {
    console.error('Failed to fetch adorations:', error)
    return NextResponse.json({ error: 'Failed to fetch adoration times' }, { status: 500 })
  }
}

// POST - Create a new adoration time slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Adoration]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, startTime, endTime, location, description, isActive } = body

    if (!day || !startTime || !location) {
      return NextResponse.json(
        { error: 'Day, start time, and location are required' },
        { status: 400 }
      )
    }

    // Get max order for new adoration slot
    let maxOrderValue = 0
    try {
      const maxOrder = await prisma.porosAdoration.aggregate({
        where: { eventId },
        _max: { order: true }
      })
      maxOrderValue = maxOrder._max.order ?? 0
    } catch {
      // Table might not exist
    }

    const adoration = await prisma.porosAdoration.create({
      data: {
        eventId,
        day,
        startTime,
        endTime: endTime || null,
        location,
        description: description || null,
        isActive: isActive ?? true,
        order: maxOrderValue + 1,
      }
    })

    return NextResponse.json(adoration, { status: 201 })
  } catch (error) {
    console.error('Failed to create adoration:', error)
    return NextResponse.json({ error: 'Failed to create adoration time' }, { status: 500 })
  }
}
