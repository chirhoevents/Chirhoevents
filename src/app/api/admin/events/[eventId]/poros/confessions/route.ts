import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { getConfessions, createConfession } from '@/lib/poros-raw-queries'

// GET - List all confession time slots for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Confessions]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    let confessions: any[] = []
    try {
      confessions = await getConfessions(eventId)
    } catch (error) {
      console.error('Confessions table might not exist:', error)
    }

    return NextResponse.json({ confessions })
  } catch (error) {
    console.error('Failed to fetch confessions:', error)
    return NextResponse.json({ error: 'Failed to fetch confessions' }, { status: 500 })
  }
}

// POST - Create a new confession time slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Confessions]',
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

    const confession = await createConfession({
      eventId,
      day,
      startTime,
      endTime: endTime || null,
      location,
      description: description || null,
      isActive: isActive ?? true,
    })

    return NextResponse.json(confession, { status: 201 })
  } catch (error) {
    console.error('Failed to create confession:', error)
    return NextResponse.json({ error: 'Failed to create confession' }, { status: 500 })
  }
}
