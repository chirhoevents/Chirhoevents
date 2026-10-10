'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  Copy, ExternalLink, Pencil, Download, Search, ChevronDown, ChevronRight, ArrowUpRight, Trash2, Eye, EyeOff,
} from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { downloadFromApi } from '@/lib/lux/download'
import { formatDateTime, formatEventDate, formatMoney, formatTimeRange } from '@/lib/lux/format'
import { SIMPLE_EVENT_STATUS_LABELS, type SimpleEventStatus } from '@/lib/lux/simple-event'
import {
  Badge, Button, Card, ErrorNote, Field, Modal, PageHeader, Select, Spinner, StatCard, TextArea, TextInput,
} from '@/components/lux/ui'
import RecordPaymentModal from '@/components/lux/RecordPaymentModal'

interface EventDetail {
  id: string
  slug: string
  title: string
  status: string
  isPublished: boolean
  liveStatus: SimpleEventStatus
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  locationName: string
  capacity: number | null
  capacityRemaining: number | null
  tickets: Array<{ id: string; name: string; price: number; capacity: number | null }>
  sold: { total: number; byOption: Record<string, number> }
}

interface Registration {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  ticketQuantity: number
  ticketSelections: Array<{ name?: string; quantity?: number; amount?: number }>
  luxDetails: { waiver?: { signedName: string; signedAt: string }; medical?: Record<string, string> } | null
  registrationStatus: string
  confirmationCode: string | null
  createdAt: string
  cancelledAt: string | null
  cancellationReason: string | null
  balance: { totalAmountDue: number; amountPaid: number; amountRemaining: number; paymentStatus: string } | null
  answers: Array<{ question: string; answer: string | null }>
  payments: Array<{ amount: number; paymentMethod: string; processedAt: string | null; createdAt: string; receiptUrl: string | null; checkNumber: string | null }>
}

const STATUS_TONE: Record<SimpleEventStatus, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  draft: 'gray', not_yet_open: 'blue', open: 'green', full: 'amber', closed: 'red', ended: 'gray',
}

function paymentBadge(r: Registration) {
  if (r.cancelledAt) return <Badge tone="red">Cancelled</Badge>
  if (r.registrationStatus === 'incomplete') return <Badge tone="amber">Paying online…</Badge>
  if (!r.balance || r.balance.totalAmountDue === 0) return <Badge tone="gray">Free</Badge>
  if (r.balance.amountRemaining <= 0) return <Badge tone="green">Paid</Badge>
  if (r.balance.amountPaid > 0) return <Badge tone="amber">Partly paid</Badge>
  return <Badge tone="amber">Pay at office</Badge>
}

export default function SimpleEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const api = useLuxApi()
  const { getToken } = useAuth()
  const { info, refresh } = useLux()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [registrations, setRegistrations] = useState<Registration[] | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [paying, setPaying] = useState<Registration | null>(null)
  const [cancelling, setCancelling] = useState<Registration | null>(null)
  const [refunding, setRefunding] = useState<Registration | null>(null)
  const [converting, setConverting] = useState(false)

  const publicUrl = typeof window !== 'undefined' && event ? `${window.location.origin}/events/${event.slug}` : ''

  const load = useCallback(async () => {
    try {
      const [e, r] = await Promise.all([
        api(`/api/lux/events/${id}`),
        api(`/api/lux/events/${id}/registrations${showCancelled ? '?cancelled=1' : ''}`),
      ])
      setEvent(e.event)
      setRegistrations(r.registrations)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [api, id, showCancelled])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!registrations) return []
    if (!q) return registrations
    return registrations.filter(r =>
      `${r.firstName} ${r.lastName} ${r.email} ${r.confirmationCode ?? ''}`.toLowerCase().includes(q))
  }, [registrations, query])

  const totals = useMemo(() => {
    const live = (registrations ?? []).filter(r => !r.cancelledAt)
    return {
      count: live.length,
      paid: live.reduce((s, r) => s + (r.balance?.amountPaid ?? 0), 0),
      outstanding: live.reduce((s, r) => s + (r.registrationStatus === 'incomplete' ? 0 : r.balance?.amountRemaining ?? 0), 0),
    }
  }, [registrations])

  const setStatus = async (action: string, success: string) => {
    setBusy(action)
    try {
      await api(`/api/lux/events/${id}/status`, { method: 'POST', json: { action } })
      toast.success(success)
      await load()
      if (action === 'publish') refresh()
    } catch (err) {
      toast.error((err as Error).message, { duration: 6000 })
    } finally {
      setBusy(null)
    }
  }

  const deleteDraft = async () => {
    if (!confirm('Delete this draft? This can’t be undone.')) return
    try {
      await api(`/api/lux/events/${id}`, { method: 'DELETE' })
      toast.success('Draft deleted')
      router.push('/dashboard/lux/programs')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (error) return <ErrorNote message={error} />
  if (!event || !registrations) return <Spinner label="Loading event…" />

  const when = `${formatEventDate(event.startDate)}${event.endDate !== event.startDate ? ` – ${formatEventDate(event.endDate)}` : ''}${formatTimeRange(event.startTime, event.endTime) ? ` · ${formatTimeRange(event.startTime, event.endTime)}` : ''}`

  return (
    <div className="space-y-5">
      <PageHeader
        title={event.title}
        back={{ href: '/dashboard/lux/programs', label: 'Programs & Events' }}
        description={<span className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[event.liveStatus]}>{SIMPLE_EVENT_STATUS_LABELS[event.liveStatus]}</Badge>
          {!event.isPublished && event.status !== 'draft' && <Badge tone="gray">Page hidden</Badge>}
          <span>{when}</span>
          {event.locationName && <span>· {event.locationName}</span>}
        </span>}
        actions={info.canManage && <>
          <Button variant="secondary" href={`/dashboard/lux/events/${id}/edit`}><Pencil className="h-4 w-4" /> Edit</Button>
          {event.status === 'draft' && (
            <Button variant="gold" loading={busy === 'publish'} onClick={() => setStatus('publish', 'Published! Registration is open.')}>Publish</Button>
          )}
          {event.status === 'registration_open' && (
            <Button variant="secondary" loading={busy === 'close'} onClick={() => setStatus('close', 'Registration closed')}>Close registration</Button>
          )}
          {event.status === 'registration_closed' && (
            <Button variant="secondary" loading={busy === 'reopen'} onClick={() => setStatus('reopen', 'Registration reopened')}>Reopen registration</Button>
          )}
        </>}
      />

      {event.status !== 'draft' && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Share this link</p>
              <p className="font-mono text-sm text-[#1E3A5F] truncate">{publicUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Link copied') }}>
                <Copy className="h-4 w-4" /> Copy link
              </Button>
              <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink className="h-4 w-4" /> View page</Button>
              {info.canManage && (event.isPublished
                ? <Button variant="ghost" loading={busy === 'hide'} onClick={() => setStatus('hide', 'Page hidden')}><EyeOff className="h-4 w-4" /> Hide page</Button>
                : <Button variant="ghost" loading={busy === 'show'} onClick={() => setStatus('show', 'Page visible again')}><Eye className="h-4 w-4" /> Show page</Button>)}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Registrations" value={totals.count} />
        <StatCard
          label="People / tickets"
          value={event.sold.total}
          hint={event.capacity ? `of ${event.capacity} (${event.capacityRemaining ?? 0} left)` : 'No capacity limit'}
        />
        <StatCard label="Collected" value={formatMoney(totals.paid)} tone="good" />
        <StatCard label="Owed (pay at office)" value={formatMoney(totals.outstanding)} tone={totals.outstanding > 0 ? 'warn' : 'default'} />
      </div>

      {event.tickets.length > 1 && (
        <Card title="By ticket type">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {event.tickets.map(t => (
              <div key={t.id} className="rounded-lg bg-[#FAF8F3] px-4 py-3">
                <p className="text-sm text-gray-600">{t.name} · {t.price > 0 ? formatMoney(t.price) : 'Free'}</p>
                <p className="text-lg font-semibold text-[#1E3A5F]">{event.sold.byOption[t.id] ?? 0}{t.capacity !== null && <span className="text-sm text-gray-500 font-normal"> / {t.capacity}</span>}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Who’s registered"
        actions={
          <Button variant="secondary" onClick={() =>
            downloadFromApi(getToken, `/api/lux/exports/event-registrations?eventId=${id}`, 'registrations.csv').catch(e => toast.error(e.message))}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <TextInput className="pl-9" placeholder="Search by name, email or confirmation #" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} className="rounded border-gray-300" />
            Show cancelled
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">{registrations.length === 0 ? 'No registrations yet.' : 'No matches.'}</p>
        ) : (
          <div className="divide-y divide-[#F0EBDF] -mx-5">
            {filtered.map(r => {
              const open = expanded === r.id
              return (
                <div key={r.id} className={r.cancelledAt ? 'opacity-60' : ''}>
                  <button type="button" onClick={() => setExpanded(open ? null : r.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#FAF8F3]">
                    {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1E3A5F] truncate">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{r.email}</p>
                    </div>
                    <div className="hidden sm:block text-sm text-gray-600 w-40 truncate">
                      {r.ticketSelections.map(l => `${l.quantity}× ${l.name}`).join(', ')}
                    </div>
                    <div className="text-sm text-gray-800 w-20 text-right">{formatMoney(r.balance?.totalAmountDue ?? 0)}</div>
                    <div className="w-28 text-right">{paymentBadge(r)}</div>
                  </button>
                  {open && (
                    <div className="px-12 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p><span className="text-gray-500">Confirmation #</span> {r.confirmationCode}</p>
                        <p><span className="text-gray-500">Registered</span> {formatDateTime(r.createdAt)}</p>
                        {r.phone && <p><span className="text-gray-500">Phone</span> {r.phone}</p>}
                        {r.street && <p><span className="text-gray-500">Address</span> {r.street}, {r.city}, {r.state} {r.zip}</p>}
                        <p><span className="text-gray-500">Tickets</span> {r.ticketSelections.map(l => `${l.quantity}× ${l.name}`).join(', ')}</p>
                        {r.luxDetails?.waiver && (
                          <p><span className="text-gray-500">Waiver</span> signed by “{r.luxDetails.waiver.signedName}” on {formatDateTime(r.luxDetails.waiver.signedAt)}</p>
                        )}
                        {r.luxDetails?.medical && Object.values(r.luxDetails.medical).some(Boolean) && (
                          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2">
                            <p className="font-medium text-red-800 mb-1">Medical / allergies</p>
                            {Object.entries(r.luxDetails.medical).filter(([, v]) => v).map(([k, v]) => (
                              <p key={k}><span className="text-gray-600 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span> {v}</p>
                            ))}
                          </div>
                        )}
                        {r.answers.length > 0 && (
                          <div className="mt-2">
                            {r.answers.map((a, i) => <p key={i}><span className="text-gray-500">{a.question}</span> {a.answer}</p>)}
                          </div>
                        )}
                        {r.cancelledAt && <p className="text-red-700">Cancelled {formatDateTime(r.cancelledAt)}{r.cancellationReason ? `: ${r.cancellationReason}` : ''}</p>}
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Payments</p>
                        {r.payments.length === 0 && <p className="text-gray-500">None yet.</p>}
                        {r.payments.map((p, i) => (
                          <p key={i}>
                            {formatMoney(p.amount)} · {p.paymentMethod}{p.checkNumber ? ` #${p.checkNumber}` : ''} · {formatDateTime(p.processedAt || p.createdAt)}
                            {p.receiptUrl && <> · <a className="underline" href={p.receiptUrl} target="_blank" rel="noreferrer">receipt</a></>}
                          </p>
                        ))}
                        {r.balance && r.balance.amountRemaining > 0 && !r.cancelledAt && (
                          <p className="mt-1 text-amber-700">Still owed: {formatMoney(r.balance.amountRemaining)}</p>
                        )}
                        {info.canManage && !r.cancelledAt && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {r.balance && r.balance.amountRemaining > 0 && r.registrationStatus !== 'incomplete' && (
                              <Button variant="primary" onClick={() => setPaying(r)}>Record payment</Button>
                            )}
                            {info.userRole === 'org_admin' && r.balance && r.balance.amountPaid > 0 && (
                              <Button variant="secondary" onClick={() => setRefunding(r)}>Refund</Button>
                            )}
                            <Button variant="danger" onClick={() => setCancelling(r)}>Cancel registration</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {info.canManage && (
        <Card title="More options">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Need housing, group registration, staff or vendors?</p>
              <p className="text-sm text-gray-500">Move this event to the full Events portal. Every registration and payment comes with it.</p>
            </div>
            <Button variant="secondary" onClick={() => setConverting(true)}><ArrowUpRight className="h-4 w-4" /> Convert to full event</Button>
          </div>
          {event.status === 'draft' && registrations.length === 0 && (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mt-4 pt-4 border-t border-[#F0EBDF]">
              <p className="text-sm text-gray-500">Don’t need this draft anymore?</p>
              <Button variant="danger" onClick={deleteDraft}><Trash2 className="h-4 w-4" /> Delete draft</Button>
            </div>
          )}
        </Card>
      )}

      <RecordPaymentModal
        open={!!paying}
        title={`Record payment – ${paying?.firstName ?? ''} ${paying?.lastName ?? ''}`}
        endpoint={`/api/lux/registrations/${paying?.id}/payments`}
        owed={paying?.balance?.amountRemaining ?? 0}
        onClose={() => setPaying(null)}
        onDone={load}
      />
      <CancelModal registration={cancelling} onClose={() => setCancelling(null)} onDone={load} />
      <RefundModal registration={refunding} onClose={() => setRefunding(null)} onDone={load} />
      <ConvertModal open={converting} eventId={id} onClose={() => setConverting(false)} />
    </div>
  )
}

function CancelModal({ registration, onClose, onDone }: { registration: Registration | null; onClose: () => void; onDone: () => void }) {
  const api = useLuxApi()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setReason('') }, [registration])

  const cancel = async () => {
    if (!registration) return
    setSaving(true)
    try {
      await api(`/api/lux/registrations/${registration.id}/cancel`, { method: 'POST', json: { reason } })
      toast.success('Registration cancelled and tickets released')
      onClose()
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!registration} onClose={onClose} title="Cancel this registration?"
      footer={<><Button variant="ghost" onClick={onClose}>Keep it</Button><Button variant="danger" onClick={cancel} loading={saving}>Cancel registration</Button></>}>
      <p className="text-sm text-gray-700 mb-3">
        {registration?.firstName} {registration?.lastName}’s {registration?.ticketQuantity} ticket(s) will be released for others.
        {registration?.balance && registration.balance.amountPaid > 0 && ' Payments stay on record; refund separately if needed.'}
      </p>
      <Field label="Reason" hint="Optional"><TextInput value={reason} onChange={e => setReason(e.target.value)} /></Field>
    </Modal>
  )
}

function RefundModal({ registration, onClose, onDone }: { registration: Registration | null; onClose: () => void; onDone: () => void }) {
  const api = useLuxApi()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'stripe' | 'manual'>('stripe')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paidByCard = !!registration?.payments.some(p => p.paymentMethod === 'card' && p.receiptUrl)

  useEffect(() => {
    if (registration) {
      setAmount(String(registration.balance?.amountPaid ?? ''))
      setMethod(registration.payments.some(p => p.paymentMethod === 'card' && p.receiptUrl) ? 'stripe' : 'manual')
      setNotes(''); setError(null)
    }
  }, [registration])

  const refund = async () => {
    if (!registration) return
    setSaving(true)
    setError(null)
    try {
      await api('/api/admin/refunds', {
        method: 'POST',
        json: {
          registrationId: registration.id,
          registrationType: 'individual',
          refundAmount: Number(amount),
          refundMethod: method,
          refundReason: 'other',
          notes,
        },
      })
      toast.success('Refund recorded')
      onClose()
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!registration} onClose={onClose} title="Refund"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={refund} loading={saving}>Refund {amount ? formatMoney(Number(amount)) : ''}</Button></>}>
      <div className="space-y-4">
        <ErrorNote message={error} />
        <Field label="Amount"><TextInput type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="How">
          <Select value={method} onChange={e => setMethod(e.target.value as 'stripe' | 'manual')}>
            {paidByCard && <option value="stripe">Back to their card (Stripe)</option>}
            <option value="manual">I refunded it myself (cash/check)</option>
          </Select>
        </Field>
        <Field label="Note" hint="Optional"><TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function ConvertModal({ open, eventId, onClose }: { open: boolean; eventId: string; onClose: () => void }) {
  const api = useLuxApi()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null)
  useEffect(() => { if (open) setUpgradeMessage(null) }, [open])

  const convert = async () => {
    setSaving(true)
    try {
      const result = await api(`/api/lux/events/${eventId}/convert`, { method: 'POST' })
      toast.success('Moved to the Events portal')
      router.push(result.redirectTo)
    } catch (e) {
      setUpgradeMessage((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Convert to a full event"
      footer={upgradeMessage
        ? <Button onClick={onClose}>Got it</Button>
        : <><Button variant="ghost" onClick={onClose}>Not now</Button><Button onClick={convert} loading={saving}>Convert</Button></>}>
      {upgradeMessage ? (
        <div className="rounded-lg bg-[#F5F1E8] border border-[#E8D9A8] p-4 text-sm text-gray-800">
          <p className="font-medium text-[#1E3A5F] mb-1">Available with a bigger plan</p>
          <p>{upgradeMessage}</p>
          <p className="mt-2"><a className="underline" href="/dashboard/lux/support?new=true">Contact support about upgrading</a></p>
        </div>
      ) : (
        <div className="text-sm text-gray-700 space-y-2">
          <p>The event moves to the full Events portal, where you can add housing, group registration, staff and vendors, deposits and more.</p>
          <p>All registrations and payments stay exactly as they are. The event will no longer appear in Lux.</p>
        </div>
      )}
    </Modal>
  )
}
