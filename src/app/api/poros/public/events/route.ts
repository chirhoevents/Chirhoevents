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
    const startDateFrom = searchParams.get('startDateFrom')
    const startDateTo = searchParams.get('startDateTo')
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const getLocations = searchParams.get('getLocations') === 'true'

    // Fetch events that have public portal enabled
    let events: any[] = []
    try {
      events = await prisma.event.findMany({
        where: {
          status: { in: ['registration_open', 'registration_closed', 'in_progress'] },
          settings: {
            porosPublicPortalEnabled: true
          }
        },
        include: {
          settings: true,
          organization: {
            select: { id: true, name: true }
          }
        },
        orderBy: { startDate: 'asc' }
      })
    } catch (error) {
      console.error('Error fetching events with settings filter:', error)
      // Fallback: just get active events without filtering on settings
      try {
        events = await prisma.event.findMany({
          where: {
            status: { in: ['registration_open', 'registration_closed', 'in_progress'] }
          },
          include: {
            settings: true,
            organization: {
              select: { id: true, name: true }
            }
          },
          orderBy: { startDate: 'asc' }
        })
        // Filter in memory if settings exist
        events = events.filter(e => e.settings?.porosPublicPortalEnabled === true)
      } catch (innerError) {
        console.error('Error with fallback query:', innerError)
        events = []
      }
    }

    // If requesting location options, return unique cities and states
    if (getLocations) {
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

    // Apply date range filter
    if (startDateFrom || startDateTo) {
      events = events.filter((event) => {
        const eventStart = new Date(event.startDate)
        if (startDateFrom && eventStart < new Date(startDateFrom)) return false
        if (startDateTo && eventStart > new Date(startDateTo)) return false
        return true
      })
    }

    // Apply city/state filter
    if (city || state) {
      events = events.filter((event) => {
        const addr = event.locationAddress as LocationAddress | null
        if (!addr) return false
        if (city && addr.city?.toLowerCase() !== city.toLowerCase()) return false
        if (state && addr.state?.toLowerCase() !== state.toLowerCase()) return false
        return true
      })
    }

    // Apply search filter
    if (search) {
      const query = search.toLowerCase()
      events = events.filter((event) => {
        const addr = event.locationAddress as LocationAddress | null
        return (
          event.name.toLowerCase().includes(query) ||
          (event.locationName && event.locationName.toLowerCase().includes(query)) ||
          (addr?.city && addr.city.toLowerCase().includes(query)) ||
          (addr?.state && addr.state.toLowerCase().includes(query)) ||
          (event.organization?.name && event.organization.name.toLowerCase().includes(query))
        )
      })
    }

    // Transform events for response
    const publicEvents = events.map((event) => {
      const addr = event.locationAddress as LocationAddress | null
      return {
        id: event.id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        locationName: event.locationName,
        locationCity: addr?.city || null,
        locationState: addr?.state || null,
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
    console.error('Error fetching poros public events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
