'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckSquare,
  Calendar,
  Users,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'

interface EventWithStats {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  salveCheckinEnabled: boolean
  stats: {
    totalParticipants: number
    checkedIn: number
  }
}

export default function SalvePortalPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventWithStats[]>([])

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      const response = await fetch('/api/admin/events?includeStats=true')
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object response formats
        const eventsArray = Array.isArray(data) ? data : (data.events || [])
        // Filter to events with SALVE enabled and that are active
        const salveEvents = eventsArray.filter((event: any) => {
          const hasSettings = event.settings?.salveCheckinEnabled
          const isActiveOrUpcoming = ['published', 'registration_open', 'registration_closed'].includes(event.status)
          return hasSettings && isActiveOrUpcoming
        }).map((event: any) => ({
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          salveCheckinEnabled: event.settings?.salveCheckinEnabled || false,
          stats: {
            totalParticipants: event._count?.participants || 0,
            checkedIn: event.checkedInCount || 0,
          },
        }))
        setEvents(salveEvents)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CheckSquare className="w-8 h-8 text-navy" />
          <h1 className="text-3xl font-bold text-navy">SALVE Check-In Portal</h1>
        </div>
        <p className="text-muted-foreground">
          Select an event to manage check-in, name tags, and welcome packets.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Events Available</h2>
            <p className="text-muted-foreground mb-4">
              There are no events with SALVE check-in enabled.
            </p>
            <Link href="/dashboard/admin/events">
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                Manage Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const checkedInPercent = event.stats.totalParticipants > 0
              ? Math.round((event.stats.checkedIn / event.stats.totalParticipants) * 100)
              : 0

            return (
              <Card key={event.id} className="hover:border-navy transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-navy">{event.name}</h2>
                        <Badge
                          className={
                            event.status === 'registration_open'
                              ? 'bg-green-500'
                              : event.status === 'registration_closed'
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                          }
                        >
                          {event.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.stats.checkedIn} / {event.stats.totalParticipants} checked in ({checkedInPercent}%)
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/admin/events/${event.id}/salve`}>
                      <Button className="bg-navy hover:bg-navy/90">
                        Open SALVE
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
