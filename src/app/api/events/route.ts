import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const filter = searchParams.get('filter') // 'upcoming' | 'past' | 'all'

    const now = new Date()

    // Build where clause - only show publicly visible (published) events
    const whereClause: any = {
      isPublished: true,
    }

    // Apply date filter
    if (filter === 'upcoming') {
      whereClause.startDate = { gte: now }
    } else if (filter === 'past') {
      whereClause.endDate = { lt: now }
    }

    // Apply search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Fetch events with organization info
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        settings: {
          select: {
            backgroundImageUrl: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
      },
      orderBy: [
        { startDate: 'asc' },
      ],
    })

    // Transform events for public consumption
    type EventType = typeof events[number]
    const publicEvents = events.map((event: EventType) => ({
      id: event.id,
      slug: event.slug,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      locationName: event.locationName,
      capacityTotal: event.capacityTotal,
      capacityRemaining: event.capacityRemaining,
      registrationOpenDate: event.registrationOpenDate,
      registrationCloseDate: event.registrationCloseDate,
      enableWaitlist: event.enableWaitlist,
      organization: event.organization,
      settings: event.settings ? {
        backgroundImageUrl: event.settings.backgroundImageUrl,
        primaryColor: event.settings.primaryColor,
        secondaryColor: event.settings.secondaryColor,
      } : null,
    }))

    return NextResponse.json({ events: publicEvents })
  } catch (error) {
    console.error('Error fetching public events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
