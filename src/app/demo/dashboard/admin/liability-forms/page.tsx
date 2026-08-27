'use client'

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
  ScrollText,
} from 'lucide-react'
import { format } from 'date-fns'
import { parseDateOnly } from '@/lib/utils'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: string
  locationName: string | null
  totalRegistrations: number
}

interface EventStats {
  totalForms: number
  approvedForms: number
  pendingForms: number
  deniedForms: number
  totalCertificates: number
  verifiedCertificates: number
  pendingCertificates: number
  letterOfGoodStandingStats: { total: number; verified: number; pending: number }
}

const DEMO_EVENTS: Event[] = [
  { id: 'evt-summer-retreat', name: 'Summer Youth Retreat 2026', startDate: '2026-07-15', endDate: '2026-07-18', status: 'registration_open', locationName: 'Steubenville, OH', totalRegistrations: 32 },
  { id: 'evt-diocesan-conference', name: 'Diocesan Youth Conference', startDate: '2026-10-03', endDate: '2026-10-05', status: 'registration_open', locationName: 'Denver, CO', totalRegistrations: 12 },
  { id: 'evt-mens-retreat', name: "Men's Silent Retreat", startDate: '2026-09-11', endDate: '2026-09-13', status: 'published', locationName: 'Malvern, PA', totalRegistrations: 3 },
  { id: 'evt-summer-2025', name: 'Summer Youth Retreat 2025', startDate: '2025-07-15', endDate: '2025-07-18', status: 'completed', locationName: 'Steubenville, OH', totalRegistrations: 58 },
  { id: 'evt-fall-draft', name: 'Fall Confirmation Retreat', startDate: '2026-11-14', endDate: '2026-11-16', status: 'draft', locationName: null, totalRegistrations: 0 },
]

const DEMO_STATS: Record<string, EventStats> = {
  'evt-summer-retreat': { totalForms: 247, approvedForms: 189, pendingForms: 58, deniedForms: 0, totalCertificates: 24, verifiedCertificates: 21, pendingCertificates: 3, letterOfGoodStandingStats: { total: 8, verified: 6, pending: 2 } },
  'evt-diocesan-conference': { totalForms: 89, approvedForms: 42, pendingForms: 47, deniedForms: 0, totalCertificates: 12, verifiedCertificates: 8, pendingCertificates: 4, letterOfGoodStandingStats: { total: 0, verified: 0, pending: 0 } },
  'evt-mens-retreat': { totalForms: 42, approvedForms: 40, pendingForms: 2, deniedForms: 0, totalCertificates: 0, verifiedCertificates: 0, pendingCertificates: 0, letterOfGoodStandingStats: { total: 0, verified: 0, pending: 0 } },
  'evt-summer-2025': { totalForms: 385, approvedForms: 385, pendingForms: 0, deniedForms: 0, totalCertificates: 42, verifiedCertificates: 42, pendingCertificates: 0, letterOfGoodStandingStats: { total: 12, verified: 12, pending: 0 } },
}

export default function LiabilityFormsPage() {
  const events = DEMO_EVENTS
  const activeEvents = events.filter((e) => ['published', 'registration_open', 'registration_closed', 'in_progress'].includes(e.status))
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
      draft: 'Draft', published: 'Published', registration_open: 'Registration Open',
      registration_closed: 'Registration Closed', in_progress: 'In Progress', completed: 'Completed',
    }
    return <Badge className={colors[status] || colors.draft}>{labels[status] || status}</Badge>
  }

  function EventCard({ event }: { event: Event }) {
    const stats = DEMO_STATS[event.id]
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{event.name}</CardTitle>
            {getStatusBadge(event.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(parseDateOnly(event.startDate), 'MMM d, yyyy')}
              {event.endDate && ` - ${format(parseDateOnly(event.endDate), 'MMM d, yyyy')}`}
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
            <span>{event.totalRegistrations} registration{event.totalRegistrations !== 1 ? 's' : ''}</span>
          </div>

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
              {stats.letterOfGoodStandingStats.total > 0 && (
                <div className="flex items-center gap-1.5 text-xs col-span-2">
                  <ScrollText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {stats.letterOfGoodStandingStats.verified}/{stats.letterOfGoodStandingStats.total} letters verified
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t">
            <Link
              href={`/demo/dashboard/admin/events/${event.id}/poros-liability`}
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

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-navy">Liability Forms</h1>
        </div>
        <p className="text-muted-foreground">
          Select an event to view and manage liability forms, Safe Environment certificates, and waiver templates.
        </p>
      </div>

      {activeEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-navy">Active Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </div>
      )}

      {draftEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-600">Draft Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {draftEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-500">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </div>
      )}
    </div>
  )
}
