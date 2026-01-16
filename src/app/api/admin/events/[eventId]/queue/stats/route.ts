import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { getQueueStats } from '@/lib/queue-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const logPrefix = '[GET /api/admin/events/queue/stats]'

  const { error, user, event } = await verifyEventAccess(request, eventId, { logPrefix })
  if (error) return error

  try {
    const stats = await getQueueStats(eventId)

    if (!stats) {
      // Queue not configured, return empty stats
      return NextResponse.json({
        queueEnabled: false,
        activeGroupSessions: 0,
        activeIndividualSessions: 0,
        waitingGroupUsers: 0,
        waitingIndividualUsers: 0,
        maxConcurrentGroup: 10,
        maxConcurrentIndividual: 40,
        recentActivity: [],
      })
    }

    // Get recent activity for live monitoring
    const recentActivity = await prisma.registrationQueue.findMany({
      where: {
        eventId,
        updatedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
      },
      select: {
        id: true,
        registrationType: true,
        status: true,
        queuePosition: true,
        enteredQueueAt: true,
        admittedAt: true,
        expiresAt: true,
        completedAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      queueEnabled: true,
      ...stats,
      recentActivity,
    })
  } catch (err) {
    console.error(`${logPrefix} Error fetching queue stats:`, err)
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    )
  }
}
