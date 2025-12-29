import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Calendar, MapPin, Users, ArrowRight, FileText, Shield } from 'lucide-react'
import { format } from 'date-fns'

export default async function PorosSelectEventPage() {
  const user = await requireAdmin()

  // Fetch all events for the organization with defensive error handling
  let events: any[] = []
  try {
    events = await prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    // Try without include if there's a schema issue
    const basicEvents = await prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        startDate: 'desc',
      },
    })
    events = basicEvents.map((e: any) => ({
      ...e,
      _count: { groupRegistrations: 0, individualRegistrations: 0 }
    }))
  }

  const activeEvents = events.filter((e: any) => e.status === 'registration_open' || e.status === 'registration_closed' || e.status === 'in_progress')
  const pastEvents = events.filter((e: any) => e.status === 'completed')
  const draftEvents = events.filter((e: any) => e.status === 'draft')

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

  function EventCard({ event }: { event: typeof events[0] }) {
    const totalRegistrations = event._count.groupRegistrations + event._count.individualRegistrations

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
              href={`/dashboard/admin/events/${event.id}/poros`}
              className="flex items-center justify-between px-3 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#1E3A5F]/90 transition-colors text-sm font-medium group"
            >
              <span className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Open Poros Assignments
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={`/dashboard/admin/events/${event.id}/poros-liability`}
              className="flex items-center justify-between px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium group"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Open Poros Liability Platform
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Home className="w-8 h-8 text-navy" />
          <h1 className="text-3xl font-bold text-navy">Poros Portal</h1>
        </div>
        <p className="text-muted-foreground">
          Select an event to manage housing, seating, small groups, and staff assignments.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              Create an event first to use the Poros Portal.
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
