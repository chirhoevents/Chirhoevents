import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface LocationAddress {
  street?: string
  city?: string
  state?: string
  zip?: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const filter = searchParams.get('filter') // 'upcoming' | 'past' | 'all'
    const startDateFrom = searchParams.get('startDateFrom')
    const startDateTo = searchParams.get('startDateTo')
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const getLocations = searchParams.get('getLocations') === 'true'

    const now = new Date()

    // If requesting location options, return unique cities and states
    if (getLocations) {
      const events = await prisma.event.findMany({
        where: { isPublished: true },
        select: { locationAddress: true, locationName: true },
      })

      const cities = new Set<string>()
      const states = new Set<string>()

      events.forEach((event) => {
        const addr = event.locationAddress as LocationAddress | null
        if (addr?.city) cities.add(addr.city)
        if (addr?.state) states.add(addr.state)
      })

      return NextResponse.json({
        cities: Array.from(cities).sort(),
        states: Array.from(states).sort(),
      })
    }

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

    // Apply custom date range filter
    if (startDateFrom || startDateTo) {
      whereClause.startDate = {}
      if (startDateFrom) {
        whereClause.startDate.gte = new Date(startDateFrom)
      }
      if (startDateTo) {
        whereClause.startDate.lte = new Date(startDateTo)
      }
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

    // Apply city/state filter (done in memory since locationAddress is JSON)
    let filteredEvents = events
    if (city || state) {
      filteredEvents = events.filter((event) => {
        const addr = event.locationAddress as LocationAddress | null
        if (!addr) return false
        if (city && addr.city?.toLowerCase() !== city.toLowerCase()) return false
        if (state && addr.state?.toLowerCase() !== state.toLowerCase()) return false
        return true
      })
    }

    // Transform events for public consumption
    const publicEvents = filteredEvents.map((event) => {
      const addr = event.locationAddress as LocationAddress | null
      return {
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        locationName: event.locationName,
        locationCity: addr?.city || null,
        locationState: addr?.state || null,
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
      }
    })

    return NextResponse.json({ events: publicEvents })
  } catch (error) {
    console.error('Error fetching public events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
