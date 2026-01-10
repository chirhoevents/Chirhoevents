'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import PorosLiabilityClient from './PorosLiabilityClient'

interface PorosLiabilityClientWrapperProps {
  eventId: string
}

interface EventData {
  id: string
  name: string
  organizationId: string
}

export default function PorosLiabilityClientWrapper({ eventId }: PorosLiabilityClientWrapperProps) {
  const { getToken } = useAuth()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvent() {
      try {
        const token = await getToken()
        const response = await fetch(`/api/admin/events/${eventId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Event not found')
          } else {
            setError('Failed to load event')
          }
          return
        }

        const data = await response.json()
        // API returns { event: {...}, stats: {...} }
        if (data.event) {
          setEvent({
            id: data.event.id,
            name: data.event.name,
            organizationId: data.event.organizationId,
          })
        } else {
          setError('Invalid event data')
        }
      } catch (err) {
        console.error('Error fetching event:', err)
        setError('Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId, getToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-lg text-red-600 mb-4">{error || 'Event not found'}</p>
        <a
          href="/dashboard/admin/events"
          className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#1E3A5F]/90"
        >
          Back to Events
        </a>
      </div>
    )
  }

  return (
    <PorosLiabilityClient
      eventId={event.id}
      eventName={event.name}
      organizationId={event.organizationId}
    />
  )
}
