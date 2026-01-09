'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Calendar, MapPin, Users, ArrowRight, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'
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

// NOTE: Auth is handled by the layout with proper retry logic.
export default function RaphaSelectEventPage() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/admin/events', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        const eventsArray = Array.isArray(data) ? data : (data.events || [])
        setEvents(eventsArray)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeEvents = events.filter((e) => e.status === 'registration_open' || e.status === 'registration_closed' || e.status === 'in_progress')
  const pastEvents = events.filter((e) => e.status === 'completed')
  const draftEvents = events.filter((e) => e.status === 'draft')

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      registration_open: 'bg-green-100 text-green-800',
      registration_closed: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
    }
    const labels: Record<string, string> = {
      draft: 'Draft',
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
      <Card className="hover:shadow-lg transition-shadow">
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-3 border-t">
            <Link
              href={`/dashboard/admin/events/${event.id}/rapha`}
              className="flex items-center justify-between px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium group"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Open Rapha Dashboard
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={`/portal/rapha/${event.id}`}
              target="_blank"
              className="flex items-center justify-between px-3 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#1E3A5F]/90 transition-colors text-sm font-medium group"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Open Medical Portal
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-navy">Rapha Medical Portal</h1>
        </div>
        <p className="text-muted-foreground">
          Select an event to access medical information, track incidents, and manage participant health data.
        </p>
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
            <h3 className="text-lg font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              Create an event first to use Rapha Medical.
            </p>
            <Link
              href="/dashboard/admin/events/new"
              className="inline-flex items-center px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
            >
              Create Event
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active/Published Events */}
          {activeEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-navy">Active Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Draft Events */}
          {draftEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-600">Draft Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftEvents.map((event) => (
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
