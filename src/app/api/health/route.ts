import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Uptime-monitor endpoint: 200 if the app and database respond, 503 if not.
// Public and returns nothing sensitive.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'database_unreachable' }, { status: 503 })
  }
}
