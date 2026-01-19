'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Calendar, MapPin, Users, ArrowRight, AlertCircle, Loader2, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
  locationName: string | null
  totalRegistrations?: number
  _count?: {
    groupRegistrations: number
    individualRegistrations: number
  }
}

/**
 * Standalone Rapha Coordinator Event Selection
 * Simple, clean interface for Rapha coordinators to select an event
 * and go directly to the dedicated medical portal
 */
export default function RaphaCoordinatorPage() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/admin/rapha/events', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        const eventsArray = Array.isArray(data) ? data : []
        setEvents(eventsArray)
      } else if (response.status === 403) {
        setError('You do not have permission to access Rapha. Please contact your administrator.')
      } else {
        setError('Unable to load events. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      setError('Unable to load events. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const activeEvents = events.filter((e) => e.status === 'published' || e.status === 'registration_open' || e.status === 'registration_closed' || e.status === 'in_progress')
  const pastEvents = events.filter((e) => e.status === 'completed')

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      registration_open: 'bg-green-100 text-green-800',
      registration_closed: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
    }
    const labels: Record<string, string> = {
      draft: 'Draft',
      published: 'Published',
      registration_open: 'Registration Open',
      registration_closed: 'Registration Closed',
      in_progress: 'In Progress',
      completed: 'Completed',
    }
    return <Badge className={colors[status] || colors.draft}>{labels[status] || status}</Badge>
  }

  function EventCard({ event }: { event: Event }) {
    const totalRegistrations = event.totalRegistrations ?? (event._count ? event._count.groupRegistrations + event._count.individualRegistrations : 0)

    return (
      <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">
              {event.name}
            </CardTitle>
            {getStatusBadge(event.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(event.startDate), 'MMM d, yyyy')}
              {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
            </span>
          </div>
          {event.locationName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{event.locationName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{totalRegistrations} registration{totalRegistrations !== 1 ? 's' : ''}</span>
          </div>

          {/* Open Portal Button */}
          <div className="pt-3 border-t">
            <Link
              href={`/portal/rapha/${event.id}`}
              className="flex items-center justify-between w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium group"
            >
              <span className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Open Medical Portal
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Access Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                fetchEvents()
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Rapha Medical Portal</h1>
            <p className="text-red-100">
              Select an event to access medical information and track incidents
            </p>
          </div>
        </div>
      </div>

      {/* HIPAA Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>HIPAA Privacy Notice:</strong> All medical information accessed through Rapha is protected
            health information (PHI). Only access information necessary for your role, and do not share
            medical details with unauthorized individuals.
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Events Available</h3>
            <p className="text-muted-foreground">
              You don&apos;t have any events with Rapha Medical enabled yet.
              Please contact your administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active/Published Events */}
          {activeEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-[#1E3A5F]">Your Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-500">Past Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
