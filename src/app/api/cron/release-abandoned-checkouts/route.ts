import { NextRequest, NextResponse } from 'next/server'
import { releaseStaleIndividualCheckouts } from '@/lib/abandoned-checkout'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/release-abandoned-checkouts
 * Called hourly by Vercel Cron. Gives back the spots held by individual card
 * registrations whose Stripe checkout was never paid (see
 * releaseStaleIndividualCheckouts).
 *
 * Headers required in production when CRON_SECRET is set:
 * - Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await releaseStaleIndividualCheckouts()
    return NextResponse.json({ success: true, ...summary, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Error releasing abandoned checkouts:', error)
    return NextResponse.json({ error: 'Failed to release abandoned checkouts' }, { status: 500 })
  }
}
