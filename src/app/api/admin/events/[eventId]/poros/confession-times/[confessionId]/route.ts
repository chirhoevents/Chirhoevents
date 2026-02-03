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
}

// PUT - Update a confession time entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; confessionId: string }> }
) {
  try {
    const { eventId, confessionId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Poros Confession Time]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, startTime, endTime, location, confessor } = body

    await ensureConfessionTimesTable()

    // Handle null values explicitly
    const endTimeValue = endTime || null
    const locationValue = location || null
    const confessorValue = confessor || null

    const entries: any[] = await prisma.$queryRaw`
      UPDATE poros_confession_times
      SET day = ${day}, start_time = ${startTime}, end_time = ${endTimeValue},
          location = ${locationValue}, confessor = ${confessorValue},
          updated_at = NOW()
      WHERE id = ${confessionId}::uuid AND event_id = ${eventId}::uuid
      RETURNING id, event_id as "eventId", day, day_date as "dayDate",
                start_time as "startTime", end_time as "endTime",
                location, confessor, "order",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    if (entries.length === 0) {
      return NextResponse.json({ error: 'Confession time not found' }, { status: 404 })
    }

    return NextResponse.json(entries[0])
  } catch (error) {
    console.error('Failed to update confession time:', error)
    return NextResponse.json({ error: 'Failed to update confession time' }, { status: 500 })
  }
}

// DELETE - Delete a confession time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; confessionId: string }> }
) {
  try {
    const { eventId, confessionId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Confession Time]',
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
      DELETE FROM poros_confession_times
      WHERE id = ${confessionId}::uuid AND event_id = ${eventId}::uuid
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession time:', error)
    return NextResponse.json({ error: 'Failed to delete confession time' }, { status: 500 })
  }
}
