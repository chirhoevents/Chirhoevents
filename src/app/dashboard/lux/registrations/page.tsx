'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, BookOpen, CalendarHeart, ClipboardList, ChevronRight } from 'lucide-react'
import { useLuxApi } from '@/contexts/LuxContext'
import { formatMoney, formatShortDate } from '@/lib/lux/format'
import { Badge, Card, EmptyState, ErrorNote, PageHeader, Select, Spinner, TextInput } from '@/components/lux/ui'
import OrderPanel from '@/components/lux/OrderPanel'

interface Row {
  kind: 'program' | 'event'
  id: string
  name: string
  contact: string | null
  email: string
  what: string
  people: number
  amount: number
  payment: string
  paymentTone: 'green' | 'amber' | 'blue'
  confirmationCode: string | null
  href: string
  orderId: string | null
  createdAt: string
}

export default function LuxRegistrationsPage() {
  const api = useLuxApi()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ type, ...(q.trim() ? { q: q.trim() } : {}) })
      api<{ registrations: Row[]; truncated: boolean }>(`/api/lux/registrations?${params}`)
        .then(d => { setRows(d.registrations); setTruncated(d.truncated) })
        .catch(e => setError(e.message))
    }, q ? 250 : 0)
    return () => clearTimeout(handle)
  }, [api, q, type, reload])

  return (
    <div className="space-y-6">
      <PageHeader title="Registrations" description="Everyone who has signed up, newest first: children in programs and people at events." />
      <Card>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email, program or event" className="pl-9" />
          </div>
          <Select value={type} onChange={e => setType(e.target.value)} className="sm:w-48">
            <option value="all">Programs and events</option>
            <option value="programs">Programs only</option>
            <option value="events">Events only</option>
          </Select>
        </div>
        <ErrorNote message={error} />
        {!rows ? <Spinner /> : rows.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title={q ? 'No matches' : 'No registrations yet'}
            description={q ? undefined : 'Share your parish page and sign-ups will show up here.'} />
        ) : (
          <>
            <div className="divide-y divide-[#F0EBDF] -mx-5">
              {rows.map(r => {
                const body = (
                  <>
                    {r.kind === 'program' ? <BookOpen className="h-4 w-4 text-[#C8A24A] shrink-0" /> : <CalendarHeart className="h-4 w-4 text-[#C8A24A] shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {r.name}{r.people > 1 && <span className="font-normal text-gray-500"> · {r.people} people</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{r.what}{r.contact ? ` · ${r.contact}` : ''} · {formatShortDate(r.createdAt)}</p>
                    </div>
                    <span className="hidden sm:block text-sm text-gray-700 w-20 text-right">{r.amount > 0 ? formatMoney(r.amount) : ''}</span>
                    <span className="w-36 text-right"><Badge tone={r.paymentTone}>{r.payment}</Badge></span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </>
                )
                return r.kind === 'program' && r.orderId ? (
                  <button key={`p-${r.id}`} type="button" onClick={() => setOpenOrder(r.orderId)} className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F3]">{body}</button>
                ) : (
                  <Link key={`${r.kind}-${r.id}`} href={r.href} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F3]">{body}</Link>
                )
              })}
            </div>
            {truncated && <p className="text-xs text-gray-500 mt-3">Showing the newest 500. Search to find older ones, or use Exports.</p>}
          </>
        )}
      </Card>
      <OrderPanel orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={() => setReload(n => n + 1)} />
    </div>
  )
}
