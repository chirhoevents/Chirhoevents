import { prisma } from '@/lib/prisma'
import PorosPublicClient from './PorosPublicClient'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Poros Portal - Event Resources',
  description: 'Access event resources, schedules, and meal times',
  manifest: '/poros-manifest.json',
  icons: {
    icon: '/AppIcons/android/mipmap-xxxhdpi/Chirho.png',
    apple: '/AppIcons/Assets.xcassets/AppIcon.appiconset/180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ChiRho',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

interface LocationAddress {
  street?: string
  city?: string
  state?: string
  zip?: string
}

export default async function PorosPublicLandingPage() {
  // Fetch events that have public portal enabled - with defensive error handling
  let events: any[] = []
  try {
    events = await prisma.event.findMany({
      where: {
        status: { in: ['published', 'registration_open', 'registration_closed', 'in_progress'] },
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
          status: { in: ['published', 'registration_open', 'registration_closed', 'in_progress'] }
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

  // Transform events for the client component
  const transformedEvents = events.map((event) => {
    const addr = event.locationAddress as LocationAddress | null
    return {
      id: event.id,
      name: event.name,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
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

  // Extract unique cities and states for filters
  const cities = [...new Set(events.map(e => (e.locationAddress as LocationAddress | null)?.city).filter(Boolean))] as string[]
  const states = [...new Set(events.map(e => (e.locationAddress as LocationAddress | null)?.state).filter(Boolean))] as string[]

  return (
    <PorosPublicClient
      initialEvents={transformedEvents}
      availableCities={cities.sort()}
      availableStates={states.sort()}
    />
  )
}
