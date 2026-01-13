import { NextRequest, NextResponse } from 'next/server'
import { cleanupAndAdmitQueue } from '@/lib/queue-utils'

// This endpoint is called by Vercel Cron every minute
// It cleans up expired sessions and admits the next people in line

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (from Vercel or local dev)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const result = await cleanupAndAdmitQueue()

    return NextResponse.json({
      success: true,
      expiredSessions: result.expiredCount,
      newlyAdmitted: result.admittedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error running queue cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to run queue cleanup' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
