'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { format } from 'date-fns'
import { Archive, ArchiveRestore, ArrowLeft, BarChart3, Calendar, Loader2, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ArchiveEventDialog from '@/components/admin/ArchiveEventDialog'
import { parseDateOnly } from '@/lib/utils'

interface ArchivedEvent {
  id: string
  name: string
  startDate: string
  endDate: string
  locationName: string | null
  totalRegistrations: number
  totalParticipants: number
  revenue: number
  archivedAt: string | null
}

const money = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// NOTE: Auth is handled by the layout with proper retry logic.
export default function ArchivedEventsPage() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<ArchivedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      const response = await fetch('/api/admin/events?archived=true&sortBy=date&sortOrder=desc', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to load archived events')
      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching archived events:', err)
      setError('Failed to load archived events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/events"
          className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#1E3A5F] mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Archived Events</h1>
        <p className="text-[#6B7280]">
          Past events kept for their records. They don&apos;t count toward your dashboard stats and
          are hidden from the rest of the admin and the public site.
        </p>
      </div>

      {loading ? (
        <Card className="p-12 text-center bg-white border-[#D1D5DB]">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E3A5F]" />
        </Card>
      ) : error ? (
        <Card className="p-12 text-center bg-white border-[#D1D5DB]">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchEvents}>Retry</Button>
        </Card>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center bg-white border-[#D1D5DB]">
          <Archive className="h-12 w-12 text-[#9C8466] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2">No archived events</h2>
          <p className="text-[#6B7280] max-w-md mx-auto">
            When an event is over, open it and click <strong>Archive</strong> to move it here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="p-5 bg-white border-[#D1D5DB]">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/admin/events/archived/${event.id}`}
                    className="text-lg font-semibold text-[#1E3A5F] hover:underline"
                  >
                    {event.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(parseDateOnly(event.startDate), 'MMM d')} –{' '}
                      {format(parseDateOnly(event.endDate), 'MMM d, yyyy')}
                    </span>
                    {event.locationName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.locationName}
                      </span>
                    )}
                    {event.archivedAt && (
                      <span>Archived {format(new Date(event.archivedAt), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div>
                    <div className="text-[#6B7280]">Registrations</div>
                    <div className="font-semibold text-[#1E3A5F]">{event.totalRegistrations}</div>
                  </div>
                  <div>
                    <div className="text-[#6B7280]">Participants</div>
                    <div className="font-semibold text-[#1E3A5F]">{event.totalParticipants}</div>
                  </div>
                  <div>
                    <div className="text-[#6B7280]">Collected</div>
                    <div className="font-semibold text-[#1E3A5F]">{money(event.revenue)}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/admin/events/archived/${event.id}`}>
                    <Button size="sm" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRestoreTarget({ id: event.id, name: event.name })}
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {restoreTarget && (
        <ArchiveEventDialog
          open={!!restoreTarget}
          onOpenChange={(open) => !open && setRestoreTarget(null)}
          eventId={restoreTarget.id}
          eventName={restoreTarget.name}
          mode="restore"
          onDone={() => {
            setRestoreTarget(null)
            fetchEvents()
          }}
        />
      )}
    </div>
  )
}
