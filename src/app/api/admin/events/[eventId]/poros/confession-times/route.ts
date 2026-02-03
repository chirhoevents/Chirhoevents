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
      confessionTimes = await prisma.$queryRaw`
        SELECT id, event_id as "eventId", day, day_date as "dayDate",
               start_time as "startTime", end_time as "endTime",
               location, confessor, "order",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM poros_confession_times
        WHERE event_id = ${eventId}::uuid
        ORDER BY day ASC, "order" ASC, start_time ASC
      `
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
    const maxOrderResult: any[] = await prisma.$queryRaw`
      SELECT COALESCE(MAX("order"), 0) as max_order
      FROM poros_confession_times
      WHERE event_id = ${eventId}::uuid AND day = ${day}
    `
    const nextOrder = (maxOrderResult[0]?.max_order ?? 0) + 1

    const entries: any[] = await prisma.$queryRaw`
      INSERT INTO poros_confession_times (id, event_id, day, day_date, start_time, end_time, location, confessor, "order", created_at, updated_at)
      VALUES (gen_random_uuid(), ${eventId}::uuid, ${day}, ${dayDate ? new Date(dayDate) : null}::date, ${startTime}, ${endTime || null}, ${location || null}, ${confessor || null}, ${nextOrder}, NOW(), NOW())
      RETURNING id, event_id as "eventId", day, day_date as "dayDate",
                start_time as "startTime", end_time as "endTime",
                location, confessor, "order",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    return NextResponse.json(entries[0], { status: 201 })
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

    await prisma.$queryRaw`
      DELETE FROM poros_confession_times WHERE event_id = ${eventId}::uuid
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession times:', error)
    return NextResponse.json({ error: 'Failed to delete confession times' }, { status: 500 })
  }
}
