import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orgId } = await params

    // Get all events for this organization
    const events = await prisma.event.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isPublished: true,
        startDate: true,
        endDate: true,
        capacityTotal: true,
        capacityRemaining: true,
        createdAt: true,
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include registration count
    const eventsWithStats = events.map(event => ({
      ...event,
      totalRegistrations: event._count.groupRegistrations + event._count.individualRegistrations,
    }))

    return NextResponse.json({ events: eventsWithStats })
  } catch (error) {
    console.error('Error fetching organization events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
