'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  Calendar,
  Users,
  Loader2,
  ArrowRight,
  AlertCircle,
  Pill,
  AlertTriangle,
  Heart,
  Utensils,
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
    severeAllergies: number
    allergies: number
    medications: number
    medicalConditions: number
    dietaryRestrictions: number
    activeIncidents: number
    totalIncidents: number
  }
}

export default function RaphaPortalPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      const response = await fetch('/api/admin/rapha/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      } else {
        // Fallback to regular events API
        const fallbackResponse = await fetch('/api/admin/events?includeStats=true')
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          // Handle both array and object response formats
          const eventsArray = Array.isArray(data) ? data : (data.events || [])
          const raphaEvents = eventsArray.filter((event: any) => {
            const hasSettings = event.settings?.raphaMedicalEnabled
            const isActiveOrUpcoming = ['published', 'registration_open', 'registration_closed'].includes(event.status)
            return hasSettings && isActiveOrUpcoming
          }).map((event: any) => ({
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            status: event.status,
            raphaMedicalEnabled: true,
            stats: {
              totalParticipants: event._count?.participants || event.totalParticipants || 0,
              severeAllergies: 0,
              allergies: 0,
              medications: 0,
              medicalConditions: 0,
              dietaryRestrictions: 0,
              activeIncidents: 0,
              totalIncidents: event.medicalIncidentCount || 0,
            },
          }))
          setEvents(raphaEvents)
        }
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-navy" />
          <h1 className="text-3xl font-bold text-navy">Rapha Medical Platform</h1>
        </div>
        <p className="text-muted-foreground">
          Manage medical incidents, track participant health information, and generate reports.
        </p>
      </div>

      {/* Event Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose an event..." />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex items-center gap-2">
                    <span>{event.name}</span>
                    <span className="text-muted-foreground text-sm">
                      ({format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEvent && (
            <div className="mt-4">
              <Link href={`/dashboard/admin/events/${selectedEventId}/rapha`}>
                <Button className="bg-navy hover:bg-navy/90">
                  <Activity className="w-4 h-4 mr-2" />
                  Access Rapha Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events List with Medical Summary */}
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
          <h2 className="text-lg font-semibold text-navy">All Events with Rapha Enabled</h2>
          {events.map((event) => (
            <Card
              key={event.id}
              className={`hover:border-navy transition-colors ${selectedEventId === event.id ? 'border-navy bg-blue-50/50' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-navy">{event.name}</h3>
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.stats.totalParticipants} participants
                      </div>
                    </div>

                    {/* Medical Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {event.stats.severeAllergies > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {event.stats.severeAllergies} severe allerg{event.stats.severeAllergies === 1 ? 'y' : 'ies'}
                          </span>
                        </div>
                      )}
                      {event.stats.allergies > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{event.stats.allergies} allergies</span>
                        </div>
                      )}
                      {event.stats.medications > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                          <Pill className="w-4 h-4" />
                          <span className="text-sm">{event.stats.medications} on medications</span>
                        </div>
                      )}
                      {event.stats.medicalConditions > 0 && (
                        <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg">
                          <Heart className="w-4 h-4" />
                          <span className="text-sm">{event.stats.medicalConditions} conditions</span>
                        </div>
                      )}
                      {event.stats.dietaryRestrictions > 0 && (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                          <Utensils className="w-4 h-4" />
                          <span className="text-sm">{event.stats.dietaryRestrictions} dietary</span>
                        </div>
                      )}
                      {event.stats.activeIncidents > 0 && (
                        <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg font-medium">
                          <Activity className="w-4 h-4" />
                          <span className="text-sm">{event.stats.activeIncidents} active incident{event.stats.activeIncidents === 1 ? '' : 's'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Link href={`/dashboard/admin/events/${event.id}/rapha`}>
                      <Button className="bg-navy hover:bg-navy/90 w-full lg:w-auto">
                        Access Rapha Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* HIPAA Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>HIPAA Privacy Notice:</strong> All medical information accessed through Rapha is protected
            health information (PHI). Only access information necessary for your role, and do not share
            medical details with unauthorized individuals.
          </div>
        </div>
      </div>
    </div>
  )
}
