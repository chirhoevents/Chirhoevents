import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSalveAccess, salveAccessErrorStatus } from '@/lib/salve-access'
import { sanitizeCustomBadges } from '@/lib/custom-badges'

// Custom badges (speakers, guests…) live under `customBadges` in the event's
// name tag template settingsJson, so no new table is needed. The template
// route strips that key on read and keeps it on save.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const template = await prisma.nameTagTemplate.findUnique({
      where: { eventId },
      select: { settingsJson: true },
    })
    const badges = sanitizeCustomBadges((template?.settingsJson as any)?.customBadges)
    return NextResponse.json({ badges })
  } catch (error: any) {
    const status = salveAccessErrorStatus(error)
    if (status) return NextResponse.json({ message: error.message }, { status })
    console.error('Failed to load custom badges:', error)
    return NextResponse.json({ message: 'Failed to load custom badges' }, { status: 500 })
  }
}

// PUT - Replace the whole list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    const body = await request.json()
    const badges = sanitizeCustomBadges(body?.badges)

    const existing = await prisma.nameTagTemplate.findUnique({
      where: { eventId },
      select: { settingsJson: true },
    })
    const settings = { ...((existing?.settingsJson as any) ?? {}), customBadges: badges }

    await prisma.nameTagTemplate.upsert({
      where: { eventId },
      create: { eventId, settingsJson: settings },
      update: { settingsJson: settings },
    })

    return NextResponse.json({ badges })
  } catch (error: any) {
    const status = salveAccessErrorStatus(error)
    if (status) return NextResponse.json({ message: error.message }, { status })
    console.error('Failed to save custom badges:', error)
    return NextResponse.json({ message: 'Failed to save custom badges' }, { status: 500 })
  }
}
