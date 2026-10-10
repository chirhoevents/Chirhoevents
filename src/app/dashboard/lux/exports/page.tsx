'use client'

import { useEffect, useState } from 'react'
import { Download, Users, Receipt, FileText, BookOpen, CalendarHeart } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { downloadFromApi } from '@/lib/lux/download'
import { formatShortDate } from '@/lib/lux/format'
import { Button, Card, PageHeader, Select } from '@/components/lux/ui'

interface Option { id: string; name: string; detail: string }

function Row({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
      <div className="flex-1 flex gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#F5F1E8] text-[#9C8466] flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <p className="font-medium text-[#1E3A5F]">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">{children}</div>
    </div>
  )
}

export default function LuxExportsPage() {
  const api = useLuxApi()
  const { getToken } = useAuth()
  const [programs, setPrograms] = useState<Option[]>([])
  const [events, setEvents] = useState<Option[]>([])
  const [programId, setProgramId] = useState('')
  const [eventId, setEventId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api<{ programs: Array<{ id: string; name: string; term: string }> }>('/api/lux/programs')
      .then(d => { setPrograms(d.programs.map(p => ({ id: p.id, name: p.name, detail: p.term }))); if (d.programs[0]) setProgramId(d.programs[0].id) })
      .catch(() => null)
    api<{ events: Array<{ id: string; name: string; startDate: string }> }>('/api/lux/events')
      .then(d => { setEvents(d.events.map(e => ({ id: e.id, name: e.name, detail: formatShortDate(e.startDate) }))); if (d.events[0]) setEventId(d.events[0].id) })
      .catch(() => null)
  }, [api])

  const download = async (key: string, url: string, name: string) => {
    setBusy(key)
    try {
      await downloadFromApi(getToken, url, name)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exports" description="Download spreadsheets (CSV) that open in Excel, Numbers or Google Sheets." />
      <Card className="overflow-hidden">
        <div className="divide-y divide-[#F0EBDF] -m-5">
          <Row icon={<BookOpen className="h-5 w-5" />} title="Program roster" description="Each child with grade, parents, contact info, allergies, sacrament details, payment and document status.">
            {programs.length === 0 ? <span className="text-sm text-gray-400">No programs yet</span> : (
              <>
                <Select value={programId} onChange={e => setProgramId(e.target.value)} className="sm:w-60">
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.detail})</option>)}
                </Select>
                <Button variant="secondary" loading={busy === 'roster'} onClick={() => download('roster', `/api/lux/exports/program-roster?programId=${programId}`, 'roster.csv')}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </>
            )}
          </Row>
          <Row icon={<FileText className="h-5 w-5" />} title="Documents still needed" description="Missing documents, ones to resubmit, and parish lookups, with family contact info.">
            <Button variant="secondary" loading={busy === 'docs'} onClick={() => download('docs', '/api/lux/exports/outstanding-documents', 'outstanding-documents.csv')}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </Row>
          <Row icon={<CalendarHeart className="h-5 w-5" />} title="Event sign-ups" description="Everyone registered for an event, with tickets, answers and payment.">
            {events.length === 0 ? <span className="text-sm text-gray-400">No events yet</span> : (
              <>
                <Select value={eventId} onChange={e => setEventId(e.target.value)} className="sm:w-60">
                  {events.map(e => <option key={e.id} value={e.id}>{e.name} ({e.detail})</option>)}
                </Select>
                <Button variant="secondary" loading={busy === 'event'} onClick={() => download('event', `/api/lux/exports/event-registrations?eventId=${eventId}`, 'event-registrations.csv')}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </>
            )}
          </Row>
          <Row icon={<Receipt className="h-5 w-5" />} title="Payments" description="Every payment for programs and events: online and at the office.">
            <Button variant="secondary" loading={busy === 'payments'} onClick={() => download('payments', '/api/lux/exports/payments', 'payments.csv')}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </Row>
          <Row icon={<Users className="h-5 w-5" />} title="Households" description="Every family on file with parents, contact info, address and children.">
            <Button variant="secondary" loading={busy === 'households'} onClick={() => download('households', '/api/lux/exports/households', 'households.csv')}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </Row>
        </div>
      </Card>
    </div>
  )
}
