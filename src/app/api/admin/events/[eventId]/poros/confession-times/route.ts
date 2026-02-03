import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// Ensure the confession times table exists (self-healing migration)
async function ensureConfessionTimesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "poros_confession_times" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "event_id" UUID NOT NULL,
      "day" VARCHAR(50) NOT NULL,
      "day_date" DATE,
      "start_time" VARCHAR(20) NOT NULL,
      "end_time" VARCHAR(20),
      "location" VARCHAR(255),
      "confessor" VARCHAR(255),
      "order" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "poros_confession_times_pkey" PRIMARY KEY ("id")
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_poros_confession_times_event" ON "poros_confession_times"("event_id")
  `)
}

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

    await ensureConfessionTimesTable()

    const confessionTimes: any[] = await prisma.$queryRaw`
      SELECT id, event_id as "eventId", day, day_date as "dayDate",
             start_time as "startTime", end_time as "endTime",
             location, confessor, "order",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM poros_confession_times
      WHERE event_id = ${eventId}::uuid
      ORDER BY day ASC, "order" ASC, start_time ASC
    `

    console.log('[Confession] Fetched', confessionTimes.length, 'entries for event', eventId)
    return NextResponse.json({ confessionTimes })
  } catch (error) {
    console.error('Failed to fetch confession times:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch confession times: ${errorMessage}` }, { status: 500 })
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

    await ensureConfessionTimesTable()

    // Get max order for the day (cast to int to avoid BigInt issues)
    const maxOrderResult: any[] = await prisma.$queryRaw`
      SELECT COALESCE(MAX("order"), 0)::int as max_order
      FROM poros_confession_times
      WHERE event_id = ${eventId}::uuid AND day = ${day}
    `
    const nextOrder = Number(maxOrderResult[0]?.max_order ?? 0) + 1

    console.log('[Confession] Creating entry:', { day, startTime, eventId, nextOrder })

    // Handle null values explicitly for raw SQL
    const dayDateValue = dayDate ? new Date(dayDate) : null
    const endTimeValue = endTime || null
    const locationValue = location || null
    const confessorValue = confessor || null

    const entries: any[] = await prisma.$queryRaw`
      INSERT INTO poros_confession_times (id, event_id, day, day_date, start_time, end_time, location, confessor, "order", created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${eventId}::uuid,
        ${day},
        ${dayDateValue},
        ${startTime},
        ${endTimeValue},
        ${locationValue},
        ${confessorValue},
        ${nextOrder},
        NOW(),
        NOW()
      )
      RETURNING id, event_id as "eventId", day, day_date as "dayDate",
                start_time as "startTime", end_time as "endTime",
                location, confessor, "order",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    console.log('[Confession] Created entry:', entries[0])

    if (!entries || entries.length === 0) {
      console.error('[Confession] INSERT returned no rows')
      return NextResponse.json({ error: 'Failed to create confession time - no rows returned' }, { status: 500 })
    }

    return NextResponse.json(entries[0], { status: 201 })
  } catch (error) {
    console.error('Failed to create confession time:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to create confession time: ${errorMessage}` }, { status: 500 })
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

    await ensureConfessionTimesTable()
    await prisma.$queryRaw`
      DELETE FROM poros_confession_times WHERE event_id = ${eventId}::uuid
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession times:', error)
    return NextResponse.json({ error: 'Failed to delete confession times' }, { status: 500 })
  }
}
