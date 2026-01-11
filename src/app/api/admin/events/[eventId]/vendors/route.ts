import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['org_admin', 'event_manager', 'finance_manager'])
    if (authResult instanceof NextResponse) return authResult

    const { eventId } = await params

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch vendor registrations
    const vendors = await prisma.vendorRegistration.findMany({
      where: { eventId },
      include: {
        _count: {
          select: {
            boothStaff: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ vendors })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor registrations' },
      { status: 500 }
    )
  }
}
