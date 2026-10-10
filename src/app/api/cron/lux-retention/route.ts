import { NextRequest, NextResponse } from 'next/server'
import { runLuxRetention } from '@/lib/lux/retention'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/lux-retention
 * Daily (Vercel Cron). Deletes documents past their program's retention
 * setting and clears expired family links. It deletes files, so it only
 * runs with CRON_SECRET (Vercel sends it automatically once it's set).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorized = cronSecret
    ? request.headers.get('authorization') === `Bearer ${cronSecret}`
    : process.env.NODE_ENV !== 'production'
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const summary = await runLuxRetention()
    return NextResponse.json({ success: true, ...summary, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[Lux retention] Failed:', error)
    return NextResponse.json({ error: 'Lux retention failed' }, { status: 500 })
  }
}
