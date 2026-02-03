import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

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

    const entries: any[] = await prisma.$queryRaw`
      UPDATE poros_confession_times
      SET day = ${day}, start_time = ${startTime}, end_time = ${endTime || null},
          location = ${location || null}, confessor = ${confessor || null},
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
