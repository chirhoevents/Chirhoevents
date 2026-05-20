import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint — returns basic event info for display purposes (no personal data)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        locationName: true,
        organization: { select: { name: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      locationName: event.locationName,
      organizationName: event.organization.name,
    })
  } catch (err) {
    console.error('[EventInfo GET] error:', err)
    return NextResponse.json({ error: 'Failed to fetch event info' }, { status: 500 })
  }
}
