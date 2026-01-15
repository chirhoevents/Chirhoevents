'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import EventDetailClient from './EventDetailClient'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface EventData {
  id: string
  name: string
  slug: string
  description: string | null
  startDate: string
  endDate: string
  status: string
  isPublished: boolean
  locationName: string | null
  locationAddress: string | null
  capacityTotal: number | null
  capacityRemaining: number | null
}

interface DayPassOption {
  id: string
  name: string
  capacity: number
  remaining: number
}

interface EventStats {
  totalRegistrations: number
  totalParticipants: number
  totalRevenue: number
  totalPaid: number
  balance: number
}

// NOTE: Auth is handled by the layout with proper retry logic.
// Server Components using requireAdmin() cause redirect loops in production
// because Clerk's auth() can fail during initial session hydration.
export default function EventDetailPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const { getToken } = useAuth()
  const [event, setEvent] = useState<EventData | null>(null)
  const [stats, setStats] = useState<EventStats | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [dayPassOptions, setDayPassOptions] = useState<DayPassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Validate eventId is a valid UUID
    if (!eventId || !UUID_REGEX.test(eventId)) {
      setError('Invalid event ID')
      setLoading(false)
      return
    }

    fetchEventData()
  }, [eventId])

  const fetchEventData = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (response.status === 404) {
        setError('Event not found')
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }

      const data = await response.json()

      // Set event data
      setEvent({
        id: data.event.id,
        name: data.event.name,
        slug: data.event.slug,
        description: data.event.description,
        startDate: data.event.startDate,
        endDate: data.event.endDate,
        status: data.event.status,
        isPublished: data.event.isPublished ?? false,
        locationName: data.event.locationName,
        locationAddress: data.event.locationAddress,
        capacityTotal: data.event.capacityTotal,
        capacityRemaining: data.event.capacityRemaining,
      })

      // Set stats
      setStats({
        totalRegistrations: data.stats?.totalRegistrations || 0,
        totalParticipants: data.stats?.totalParticipants || 0,
        totalRevenue: data.stats?.totalRevenue || 0,
        totalPaid: data.stats?.totalPaid || 0,
        balance: data.stats?.balance || 0,
      })

      // Set settings
      setSettings(data.event.settings || null)

      // Set day pass options
      setDayPassOptions(data.event.dayPassOptions?.map((dp: any) => ({
        id: dp.id,
        name: dp.name,
        capacity: dp.capacity,
        remaining: dp.remaining,
      })) || [])
    } catch (err) {
      console.error('Error fetching event:', err)
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error === 'Event not found' || error === 'Invalid event ID') {
    notFound()
  }

  if (error || !event || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || 'Failed to load event'}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchEventData(); }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <EventDetailClient
      event={event}
      stats={stats}
      settings={settings}
      dayPassOptions={dayPassOptions}
    />
  )
}
