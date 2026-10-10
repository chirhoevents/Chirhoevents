'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HandHeart, Wallet, Receipt, ChevronRight } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { formatDateTime, formatMoney, formatShortDate } from '@/lib/lux/format'
import { ORDER_STATUS_LABELS } from '@/lib/lux/program-status'
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Spinner, StatCard, Tabs } from '@/components/lux/ui'
import OrderPanel, { ORDER_TONE } from '@/components/lux/OrderPanel'
import RecordPaymentModal from '@/components/lux/RecordPaymentModal'

interface OrderRow {
  id: string
  confirmationCode: string
  householdId: string
  family: string
  email: string
  phone: string
  children: string[]
  status: string
  total: number
  amountDue: number
  owed: number
  note: string | null
  createdAt: string
}
interface EventBalance {
  registrationId: string
  name: string
  email: string
  people: number
  eventId: string
  eventName: string
  eventDate: string
  total: number
  paid: number
  owed: number
}
interface PaymentsData {
  assistance: OrderRow[]
  ordersOwing: OrderRow[]
  eventBalances: EventBalance[]
  recent: Array<{
    id: string; amount: number; method: string; online: boolean; at: string; who: string; what: string
    orderId: string | null; eventId: string | null; recordedBy: string | null; receiptUrl: string | null
  }>
  totals: { year: number; online: number; office: number; refunded: number; outstanding: number }
}

export default function LuxPaymentsPage() {
  const api = useLuxApi()
  const { info } = useLux()
  const [data, setData] = useState<PaymentsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'owing' | 'recent'>('owing')
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const [paying, setPaying] = useState<EventBalance | null>(null)

  const load = useCallback(() => {
    api<PaymentsData>('/api/lux/payments').then(setData).catch(e => setError(e.message))
  }, [api])
  useEffect(() => { load() }, [load])

  if (error) return <ErrorNote message={error} />
  if (!data) return <Spinner />
  const t = data.totals

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Fee assistance, who still owes, and what’s come in." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={`Paid online in ${t.year}`} value={formatMoney(t.online)} />
        <StatCard label={`Paid at the office in ${t.year}`} value={formatMoney(t.office)} />
        <StatCard label="Still owed" value={formatMoney(t.outstanding)} tone={t.outstanding ? 'warn' : 'default'} />
        <StatCard label={`Refunded in ${t.year}`} value={formatMoney(t.refunded)} />
      </div>

      {data.assistance.length > 0 && (
        <Card title={<span className="flex items-center gap-2"><HandHeart className="h-5 w-5 text-[#C8A24A]" /> Fee assistance requests</span>}
          description="Only your parish staff see these. The family is told privately once you decide.">
          <div className="divide-y divide-[#F0EBDF] -mx-5">
            {data.assistance.map(o => (
              <button key={o.id} type="button" onClick={() => setOpenOrder(o.id)} className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F3]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1E3A5F]">{o.family}</p>
                  <p className="text-xs text-gray-500 truncate">{o.children.join(', ')}</p>
                  {o.note && <p className="text-sm text-gray-700 mt-1 line-clamp-2">“{o.note}”</p>}
                </div>
                <div className="text-right text-sm shrink-0">
                  <p>{formatMoney(o.total)}</p>
                  <p className="text-xs text-gray-500">{formatShortDate(o.createdAt)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'owing', label: <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4" /> Still owed ({data.ordersOwing.length + data.eventBalances.length})</span> },
          { value: 'recent', label: <span className="flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Recent payments</span> },
        ]} />

        {tab === 'owing' && (
          data.ordersOwing.length + data.eventBalances.length === 0 ? (
            <EmptyState title="Everyone is paid up" description="Families paying at the office and event balances show up here." />
          ) : (
            <div className="space-y-6">
              {data.ordersOwing.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Faith formation</p>
                  <div className="divide-y divide-[#F0EBDF] -mx-5">
                    {data.ordersOwing.map(o => (
                      <button key={o.id} type="button" onClick={() => setOpenOrder(o.id)} className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F3]">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1E3A5F]">{o.family} <span className="text-xs font-normal text-gray-500">#{o.confirmationCode}</span></p>
                          <p className="text-xs text-gray-500 truncate">{o.children.join(', ')}</p>
                        </div>
                        <Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                        <p className="w-24 text-right font-medium text-amber-700">{formatMoney(o.owed)}</p>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {data.eventBalances.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Events</p>
                  <div className="divide-y divide-[#F0EBDF] -mx-5">
                    {data.eventBalances.map(b => (
                      <div key={b.registrationId} className="flex items-center gap-4 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{b.name}{b.people > 1 && <span className="text-xs font-normal text-gray-500"> · {b.people} people</span>}</p>
                          <Link href={`/dashboard/lux/events/${b.eventId}`} className="text-xs text-gray-500 hover:underline">{b.eventName} · {formatShortDate(b.eventDate)}</Link>
                        </div>
                        <p className="w-24 text-right font-medium text-amber-700">{formatMoney(b.owed)}</p>
                        {info.canManage && <Button variant="secondary" onClick={() => setPaying(b)}>Record payment</Button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {tab === 'recent' && (
          data.recent.length === 0 ? <EmptyState title="No payments yet" /> : (
            <div className="divide-y divide-[#F0EBDF] -mx-5 text-sm">
              {data.recent.map(p => {
                const body = (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{p.who}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.what} · {p.online ? 'Paid online' : p.method}{p.recordedBy ? ` · recorded by ${p.recordedBy}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 hidden sm:block">{formatDateTime(p.at)}</span>
                    <span className="w-24 text-right font-medium">{formatMoney(p.amount)}</span>
                  </>
                )
                return p.orderId ? (
                  <button key={p.id} type="button" onClick={() => setOpenOrder(p.orderId)} className="w-full text-left flex items-center gap-4 px-5 py-2.5 hover:bg-[#FAF8F3]">{body}</button>
                ) : (
                  <Link key={p.id} href={p.eventId ? `/dashboard/lux/events/${p.eventId}` : '#'} className="flex items-center gap-4 px-5 py-2.5 hover:bg-[#FAF8F3]">{body}</Link>
                )
              })}
            </div>
          )
        )}
      </Card>

      <OrderPanel orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={load} />
      <RecordPaymentModal
        open={!!paying}
        title={`Record payment – ${paying?.name ?? ''}`}
        endpoint={`/api/lux/registrations/${paying?.registrationId}/payments`}
        owed={paying?.owed ?? 0}
        onClose={() => setPaying(null)}
        onDone={load}
      />
    </div>
  )
}
