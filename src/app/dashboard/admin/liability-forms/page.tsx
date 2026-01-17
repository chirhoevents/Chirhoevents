'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react'
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

interface EventStats {
  totalForms: number
  approvedForms: number
  pendingForms: number
  deniedForms: number
  totalCertificates: number
  verifiedCertificates: number
  pendingCertificates: number
}

export default function LiabilityFormsPage() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({})
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

        // Fetch stats for each event
        for (const event of eventsArray) {
          fetchEventStats(event.id, token)
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEventStats = async (eventId: string, token: string | null) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/poros-liability/stats`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const stats = await response.json()
        setEventStats(prev => ({ ...prev, [eventId]: stats }))
      }
    } catch (error) {
      console.error(`Error fetching stats for event ${eventId}:`, error)
    }
  }

  const activeEvents = events.filter((e) =>
    e.status === 'published' || e.status === 'registration_open' || e.status === 'registration_closed' || e.status === 'in_progress'
  )
  const pastEvents = events.filter((e) => e.status === 'completed')
  const draftEvents = events.filter((e) => e.status === 'draft')

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
    const stats = eventStats[event.id]
    const totalRegistrations = event.totalRegistrations ??
      (event._count ? event._count.groupRegistrations + event._count.individualRegistrations : 0)

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

          {/* Liability Form Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{stats.totalForms} forms</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span>{stats.approvedForms} approved</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-yellow-600" />
                <span>{stats.pendingForms} pending</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>{stats.totalCertificates} certs</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-3 border-t">
            <Link
              href={`/dashboard/admin/events/${event.id}/poros-liability`}
              className="flex items-center justify-between px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium group w-full"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Manage Liability Forms
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
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-navy">Liability Forms</h1>
        </div>
        <p className="text-muted-foreground">
          Select an event to view and manage liability forms, Safe Environment certificates, and waiver templates.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              Create an event first to manage liability forms.
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
          {/* Active Events */}
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
