import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Public, read-only: tells the middleware whether the master-admin
// "Maintenance Mode" toggle is on. Exposes nothing else.
export async function GET() {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { settingKey: 'maintenance_mode' },
      select: { settingValue: true },
    })
    return NextResponse.json({ enabled: setting?.settingValue === 'true' })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
