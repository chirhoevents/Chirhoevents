import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

/**
 * POST /api/user/last-dashboard  { dashboard: 'events' | 'lux' }
 *
 * Remembers which dashboard this person switched to, so orgs with both
 * Events and Lux open the one they used last next time they sign in.
 */
export async function POST(request: NextRequest) {
  const clerkUserId = await getClerkUserIdFromRequest(request)
  if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dashboard } = await request.json().catch(() => ({}))
  if (dashboard !== 'events' && dashboard !== 'lux') {
    return NextResponse.json({ error: 'dashboard must be "events" or "lux"' }, { status: 400 })
  }

  await prisma.user.updateMany({ where: { clerkUserId }, data: { lastDashboard: dashboard } })
  return NextResponse.json({ success: true })
}
