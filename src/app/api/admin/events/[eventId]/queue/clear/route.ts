import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { clearStuckSessions, cleanupAndAdmitQueue } from '@/lib/queue-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const logPrefix = '[POST /api/admin/events/queue/clear]'

  const { error, user, event } = await verifyEventAccess(request, eventId, { logPrefix })
  if (error) return error

  try {
    // Clear stuck sessions for this event
    const clearedCount = await clearStuckSessions(eventId)

    // Run cleanup to admit next in line
    const { admittedCount } = await cleanupAndAdmitQueue()

    console.log(`${logPrefix} Cleared ${clearedCount} stuck sessions, admitted ${admittedCount} new users by ${user?.email}`)

    return NextResponse.json({
      success: true,
      clearedSessions: clearedCount,
      newlyAdmitted: admittedCount,
    })
  } catch (err) {
    console.error(`${logPrefix} Error clearing stuck sessions:`, err)
    return NextResponse.json(
      { error: 'Failed to clear stuck sessions' },
      { status: 500 }
    )
  }
}
