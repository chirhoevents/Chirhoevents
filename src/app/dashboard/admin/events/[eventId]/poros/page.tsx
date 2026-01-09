'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import PorosPortalClient from './PorosPortalClient'

// NOTE: Auth is handled by the layout with proper retry logic.
// Server Components using requireAdmin() cause redirect loops in production
// because Clerk's auth() can fail during initial session hydration.
export default function PorosPortalPage() {
  const params = useParams()
  const eventId = params?.eventId as string
  const { getToken } = useAuth()
  const [eventName, setEventName] = useState<string>('')
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
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
      setEventName(data.event.name)
      setSettings(data.event.settings || {})
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
          <p className="mt-2 text-muted-foreground">Loading POROS...</p>
        </div>
      </div>
    )
  }

  if (error === 'Event not found' || error === 'Invalid event ID') {
    notFound()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
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
    <PorosPortalClient
      eventId={eventId}
      eventName={eventName}
      settings={settings}
    />
  )
}
