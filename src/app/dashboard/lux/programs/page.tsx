'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, CalendarHeart, BookOpen, ChevronRight } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { formatMoney, formatShortDate } from '@/lib/lux/format'
import { SIMPLE_EVENT_STATUS_LABELS, type SimpleEventStatus } from '@/lib/lux/simple-event'
import { PROGRAM_STATUS_LABELS } from '@/lib/lux/program-status'
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Spinner } from '@/components/lux/ui'

interface EventRow {
  id: string
  name: string
  startDate: string
  liveStatus: SimpleEventStatus
  registrations: number
  ticketsSold: number
  capacityTotal: number | null
  amountPaid: number
  amountOutstanding: number
}

interface ProgramRow {
  id: string
  name: string
  term: string
  status: string
  isOpen: boolean
  capacity: number | null
  registered: number
  unpaid: number
  outstandingDocuments: number
}

const EVENT_TONE: Record<SimpleEventStatus, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  draft: 'gray', not_yet_open: 'blue', open: 'green', full: 'amber', closed: 'red', ended: 'gray',
}

export default function ProgramsAndEventsPage() {
  const api = useLuxApi()
  const { info } = useLux()
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api('/api/lux/events'), api('/api/lux/programs')])
      .then(([e, p]) => { setEvents(e.events); setPrograms(p.programs) })
      .catch(err => setError(err.message))
  }, [api])

  if (error) return <ErrorNote message={error} />
  if (!events || !programs) return <Spinner />

  const upcoming = events.filter(e => e.liveStatus !== 'ended')
  const past = events.filter(e => e.liveStatus === 'ended')

  const programStatus = (p: ProgramRow) =>
    p.status === 'open' && !p.isOpen ? <Badge tone="blue">Scheduled / closed by date</Badge>
      : <Badge tone={p.status === 'open' ? 'green' : p.status === 'draft' ? 'gray' : 'red'}>{PROGRAM_STATUS_LABELS[p.status] ?? p.status}</Badge>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs & Events"
        description={info.simpleEvents.limit === null
          ? 'Everything your parish is taking registrations for.'
          : `${info.simpleEvents.used} of ${info.simpleEvents.limit} simple events used this year. Programs are unlimited.`}
        actions={info.canManage && <Button variant="gold" href="/dashboard/lux/new"><Plus className="h-4 w-4" /> Set something up</Button>}
      />

      <Card title={<span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-[#C8A24A]" /> Classes &amp; sacrament programs</span>}
        actions={info.canManage && <Button variant="secondary" href="/dashboard/lux/programs/new">New program</Button>}>
        {programs.length === 0 ? (
          <EmptyState title="No programs yet" description="Set up Faith Formation, First Communion or Confirmation and families can register their children online."
            action={info.canManage && <Button href="/dashboard/lux/programs/new">Set up a program</Button>} />
        ) : (
          <div className="divide-y divide-[#F0EBDF] -mx-5">
            {programs.map(p => (
              <Link key={p.id} href={`/dashboard/lux/programs/${p.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F3]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1E3A5F] truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.term}</p>
                </div>
                <div className="hidden md:block text-sm text-gray-700 w-28 text-right">
                  {p.registered}{p.capacity ? ` / ${p.capacity}` : ''} <span className="text-gray-500">children</span>
                </div>
                <div className="hidden md:flex flex-col items-end w-36 text-xs gap-1">
                  {p.unpaid > 0 && <span className="text-amber-700">{p.unpaid} not paid</span>}
                  {p.outstandingDocuments > 0 && <span className="text-amber-700">{p.outstandingDocuments} documents missing</span>}
                </div>
                <div className="w-40 text-right">{programStatus(p)}</div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card title={<span className="flex items-center gap-2"><CalendarHeart className="h-5 w-5 text-[#C8A24A]" /> Events &amp; sign-ups</span>}
        actions={info.canManage && <Button variant="secondary" href="/dashboard/lux/events/new">New event</Button>}>
        {events.length === 0 ? (
          <EmptyState title="No events yet" description="Fish fry, Bible study, retreat or picnic: a sign-up page in a couple of minutes."
            action={info.canManage && <Button href="/dashboard/lux/events/new">Set up an event</Button>} />
        ) : (
          <div className="space-y-4">
            {[{ label: 'Upcoming', rows: upcoming }, { label: 'Past', rows: past }].filter(g => g.rows.length).map(group => (
              <div key={group.label}>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{group.label}</p>
                <div className="divide-y divide-[#F0EBDF] -mx-5">
                  {group.rows.map(e => (
                    <Link key={e.id} href={`/dashboard/lux/events/${e.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F3]">
                      <div className="w-16 text-center shrink-0">
                        <p className="text-xs text-gray-500">{formatShortDate(e.startDate).split(',')[0]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1E3A5F] truncate">{e.name}</p>
                        <p className="text-xs text-gray-500">{e.registrations} registration{e.registrations === 1 ? '' : 's'} · {e.ticketsSold}{e.capacityTotal ? ` / ${e.capacityTotal}` : ''} people</p>
                      </div>
                      <div className="hidden md:block text-right text-sm w-32">
                        <p className="text-gray-800">{formatMoney(e.amountPaid)}</p>
                        {e.amountOutstanding > 0 && <p className="text-xs text-amber-700">{formatMoney(e.amountOutstanding)} owed</p>}
                      </div>
                      <div className="w-24 text-right"><Badge tone={EVENT_TONE[e.liveStatus]}>{SIMPLE_EVENT_STATUS_LABELS[e.liveStatus]}</Badge></div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
