'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Calendar,
  Users,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'

interface EventWithStats {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  raphaMedicalEnabled: boolean
  stats: {
    totalParticipants: number
    medicalIncidents: number
  }
}

export default function RaphaPortalPage() {
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
        // Filter to events with RAPHA enabled and that are active
        const raphaEvents = data.filter((event: any) => {
          const hasSettings = event.settings?.raphaMedicalEnabled
          const isActiveOrUpcoming = ['published', 'registration_open', 'registration_closed'].includes(event.status)
          return hasSettings && isActiveOrUpcoming
        }).map((event: any) => ({
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          raphaMedicalEnabled: event.settings?.raphaMedicalEnabled || false,
          stats: {
            totalParticipants: event._count?.participants || 0,
            medicalIncidents: event.medicalIncidentCount || 0,
          },
        }))
        setEvents(raphaEvents)
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
          <Activity className="w-8 h-8 text-navy" />
          <h1 className="text-3xl font-bold text-navy">Rapha Medical Portal</h1>
        </div>
        <p className="text-muted-foreground">
          Select an event to manage medical incidents and first aid records.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Events Available</h2>
            <p className="text-muted-foreground mb-4">
              There are no events with Rapha medical tracking enabled.
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
          {events.map((event) => (
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
                        {event.stats.totalParticipants} participants
                      </div>
                      {event.stats.medicalIncidents > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          {event.stats.medicalIncidents} incidents recorded
                        </div>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/admin/events/${event.id}/rapha`}>
                    <Button className="bg-navy hover:bg-navy/90">
                      Open Rapha
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
