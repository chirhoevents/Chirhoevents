import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEventEndsAt } from '@/lib/event-ended'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/complete-ended-events
 * Hourly (Vercel Cron). Marks events "completed" once their last day is
 * over in the event's timezone, which moves them to "Past events" in the
 * admin portals. Online liability forms and group leader changes stop at
 * the same moment (see lib/event-ended). No data is deleted.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorized = cronSecret
    ? request.headers.get('authorization') === `Bearer ${cronSecret}`
    : process.env.NODE_ENV !== 'production'
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    // endDate comes back as UTC midnight of the last day, and every timezone's
    // end-of-day falls after that, so this catches every event that may be over.
    const candidates = await prisma.event.findMany({
      where: {
        mode: 'full',
        status: { notIn: ['draft', 'completed'] },
        endDate: { lt: now },
      },
      select: { id: true, endDate: true, timezone: true },
    })

    const endedIds = candidates
      .filter((event) => now >= getEventEndsAt(event))
      .map((event) => event.id)

    if (endedIds.length > 0) {
      await prisma.event.updateMany({
        where: { id: { in: endedIds } },
        data: { status: 'completed' },
      })
    }

    return NextResponse.json({ success: true, completed: endedIds.length, timestamp: now.toISOString() })
  } catch (error) {
    console.error('[Complete ended events] Failed:', error)
    return NextResponse.json({ error: 'Failed to complete ended events' }, { status: 500 })
  }
}
