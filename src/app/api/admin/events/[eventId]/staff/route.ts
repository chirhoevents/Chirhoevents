import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['org_admin', 'event_manager', 'finance_manager', 'poros_coordinator'])
    if (authResult instanceof NextResponse) return authResult

    const { eventId } = await params

    // Verify event exists and user has access
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch staff registrations
    const staff = await prisma.staffRegistration.findMany({
      where: { eventId },
      include: {
        vendorRegistration: {
          select: {
            businessName: true,
          },
        },
        liabilityForm: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff registrations' },
      { status: 500 }
    )
  }
}
