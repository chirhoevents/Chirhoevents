'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import AccessCodesClient from './AccessCodesClient'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface EventData {
  id: string
  name: string
}

export default function AccessCodesPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const { getToken } = useAuth()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      setEvent({
        id: data.event.id,
        name: data.event.name,
      })
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
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || 'Failed to load event'}</p>
        </div>
      </div>
    )
  }

  return <AccessCodesClient eventId={eventId} eventName={event.name} />
}
