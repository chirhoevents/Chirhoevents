'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle,
  Send,
  BellRing,
  Undo2,
  Copy,
  Shield,
  Upload,
  Gift,
  RotateCcw,
  StickyNote,
  KeyRound,
  ClipboardCheck,
} from 'lucide-react'
import {
  money,
  PaymentBadge,
  StatusBadge,
  vendorApi,
  vendorBalance,
  type InvoiceLineItem,
  type VendorRegistration,
  type VendorTierOption,
} from './vendor-types'

interface PersonName {
  firstName: string
  lastName: string
}

interface DetailResponse {
  vendor: VendorRegistration & {
    boothStaff: Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      phone: string
      role: string
      checkedIn: boolean
      createdAt: string
    }>
  }
  payments: Array<{
    id: string
    amount: string | number
    paymentMethod: string
    paymentStatus: string
    checkNumber: string | null
    notes: string | null
    processedAt: string | null
    createdAt: string
    processedBy: PersonName | null
  }>
  refunds: Array<{
    id: string
    refundAmount: string | number
    refundMethod: string
    refundReason: string
    notes: string | null
    status: string
    createdAt: string
    processedBy: PersonName | null
  }>
  activity: Array<{
    id: string
    editType: string
    changesMade: { action?: string; [key: string]: unknown } | null
    adminNotes: string | null
    oldTotal: string | number | null
    newTotal: string | number | null
    emailSent: boolean
    editedAt: string
    editedBy: PersonName | null
  }>
  emails: Array<{
    id: string
    subject: string
    emailType: string
    sentStatus: string
    sentAt: string
    recipientEmail: string
  }>
}

export interface VendorPanelActions {
  review: (v: VendorRegistration) => void
  email: (v: VendorRegistration) => void
  recordPayment: (v: VendorRegistration, payInFull: boolean) => void
  refund: (v: VendorRegistration) => void
  resendCodes: (v: VendorRegistration) => void
  uploadCert: (v: VendorRegistration) => void
  moveToPending: (v: VendorRegistration) => void
  remove: (v: VendorRegistration) => void
}

interface Props {
  eventId: string
  vendorId: string | null
  tiers: VendorTierOption[]
  /** Bump to make the panel re-fetch (after an action done by the page). */
  refreshKey: number
  initialTab?: string
  actions: VendorPanelActions
  onClose: () => void
  onChanged: () => void
}

const METHOD_LABELS: Record<string, string> = {
  check: 'Check',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  other: 'Other',
  stripe: 'Stripe',
  manual: 'Manual',
}

const who = (p: PersonName | null) => (p ? `${p.firstName} ${p.lastName}` : 'System')

function describeActivity(a: DetailResponse['activity'][number]): string {
  const c = a.changesMade || {}
  switch (c.action) {
    case 'note':
      return 'Added a note'
    case 'details_edited': {
      const fields = Object.keys((c.changes as Record<string, unknown>) || {})
      return `Edited ${fields.length ? fields.join(', ') : 'details'}`
    }
    case 'invoice_edited':
      return `Edited invoice (${money(a.oldTotal)} → ${money(a.newTotal)})`
    case 'fee_waived':
      return `Waived booth fee (${money(a.oldTotal)} → $0.00)`
    case 'payment_recorded':
      return `Recorded ${METHOD_LABELS[String(c.method)] || ''} payment of ${money(c.amount as number)}${c.checkNumber ? ` (check #${c.checkNumber})` : ''}`
    case 'invoice_sent':
      return 'Emailed invoice'
    case 'reminder_sent':
      return `Sent payment reminder (${money(c.balance as number)} due)`
    case 'reopened':
      return 'Re-opened rejected application (moved to pending)'
    case 'approval_revoked':
      return 'Revoked approval (moved to pending)'
    case 'created_by_admin':
      return 'Added vendor manually'
    default:
      if (a.editType === 'refund_processed') return `Processed refund of ${money(c.refundAmount as number)}`
      return a.editType.replace(/_/g, ' ')
  }
}

export default function VendorDetailPanel({
  eventId,
  vendorId,
  tiers,
  refreshKey,
  initialTab,
  actions,
  onClose,
  onChanged,
}: Props) {
  const { getToken } = useAuth()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState(initialTab || 'overview')

  // Overview edit state
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Invoice edit state
  const [editingInvoice, setEditingInvoice] = useState(false)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [emailInvoice, setEmailInvoice] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  // Notes
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)
    const res = await vendorApi<DetailResponse>(getToken, `/api/admin/events/${eventId}/vendors/${vendorId}`)
    setLoading(false)
    if (res.ok) setData(res.data)
    else alert(`Failed to load vendor: ${res.error}`)
  }, [eventId, vendorId, getToken])

  useEffect(() => {
    if (vendorId) {
      setTab(initialTab || 'overview')
      setEditing(false)
      setEditingInvoice(false)
      setEdits({})
      setNote('')
    } else {
      setData(null)
    }
  }, [vendorId, initialTab])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const vendor = data?.vendor && data.vendor.id === vendorId ? data.vendor : null
  const balance = vendor ? vendorBalance(vendor) : 0
  const afterChange = () => {
    load()
    onChanged()
  }

  // ---------- Overview ----------
  const field = (key: keyof VendorRegistration) =>
    edits[key as string] ?? String((vendor?.[key] as string | number | null) ?? '')

  const saveEdits = async () => {
    if (!vendor) return
    setSaving(true)
    const body: Record<string, unknown> = { ...edits }
    if (body.tierPrice !== undefined) body.tierPrice = Number(body.tierPrice)
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}`, 'PATCH', body)
    setSaving(false)
    if (!res.ok) {
      alert(`Failed to save: ${res.error}`)
      return
    }
    setEditing(false)
    setEdits({})
    afterChange()
  }

  const pickTier = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId)
    if (tier) setEdits((e) => ({ ...e, selectedTier: tier.name, tierPrice: String(tier.price) }))
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    alert(`${label} copied`)
  }

  // ---------- Invoice ----------
  const startInvoiceEdit = () => {
    if (!vendor) return
    const existing = vendor.invoiceLineItems || []
    setLineItems(
      existing.length > 0
        ? existing.map((i) => ({ description: i.description, amount: Number(i.amount) }))
        : [{ description: vendor.selectedTier, amount: Number(vendor.tierPrice) }]
    )
    setInvoiceNotes(vendor.invoiceNotes || '')
    setEmailInvoice(true)
    setEditingInvoice(true)
  }

  const saveInvoice = async (waive = false) => {
    if (!vendor) return
    if (waive && !confirm(`Waive the booth fee for ${vendor.businessName}? Their invoice will become $0.00.`)) return
    setBusy(waive ? 'waive' : 'invoice')
    const res = await vendorApi<{ overpaid: number; emailSent: boolean }>(
      getToken,
      `/api/admin/events/${eventId}/vendors/${vendor.id}/invoice`,
      'PUT',
      waive
        ? { waive: true, sendEmail: false }
        : { lineItems, invoiceNotes, sendEmail: emailInvoice }
    )
    setBusy(null)
    if (!res.ok) {
      alert(`Failed to update invoice: ${res.error}`)
      return
    }
    setEditingInvoice(false)
    if (res.data.overpaid > 0) {
      alert(`Invoice saved. ${vendor.businessName} has now overpaid by ${money(res.data.overpaid)} — use Refund if you want to return it.`)
    }
    afterChange()
  }

  const sendInvoice = async (type: 'invoice' | 'reminder') => {
    if (!vendor) return
    const label = type === 'reminder' ? `a payment reminder (${money(balance)} due)` : 'their invoice'
    if (!confirm(`Email ${label} to ${vendor.email}?`)) return
    setBusy(type)
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}/send-invoice`, 'POST', { type })
    setBusy(null)
    if (!res.ok) {
      alert(`Failed to send: ${res.error}`)
      return
    }
    alert(type === 'reminder' ? 'Payment reminder sent.' : 'Invoice sent.')
    afterChange()
  }

  // ---------- Notes ----------
  const addNote = async () => {
    if (!vendor || !note.trim()) return
    setBusy('note')
    const res = await vendorApi(getToken, `/api/admin/events/${eventId}/vendors/${vendor.id}/notes`, 'POST', { note })
    setBusy(null)
    if (!res.ok) {
      alert(`Failed to add note: ${res.error}`)
      return
    }
    setNote('')
    load()
  }

  const invoiceTotalDraft = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const timeline = data
    ? [
        ...data.activity.map((a) => ({
          id: `a-${a.id}`,
          at: a.editedAt,
          by: who(a.editedBy),
          text: describeActivity(a),
          note: a.adminNotes,
          isNote: a.changesMade?.action === 'note',
          icon: a.changesMade?.action === 'note' ? 'note' : 'edit',
        })),
        ...data.emails.map((e) => ({
          id: `e-${e.id}`,
          at: e.sentAt,
          by: e.recipientEmail,
          text: `Email${e.sentStatus === 'failed' ? ' FAILED' : ' sent'}: ${e.subject}`,
          note: null as string | null,
          isNote: false,
          icon: 'email',
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    : []

  return (
    <Dialog open={!!vendorId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-full max-h-screen w-full max-w-2xl overflow-y-auto rounded-none sm:rounded-none p-0 gap-0 block data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-top-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100">
        <DialogTitle className="sr-only">{vendor?.businessName || 'Vendor'}</DialogTitle>
        {!vendor ? (
          <div className="flex items-center justify-center h-64">
            {loading ? <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" /> : <p className="text-gray-500">Vendor not found</p>}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-6 pt-6 pb-4">
              <div className="flex items-start gap-4 pr-8">
                {vendor.logoUrl ? (
                  <img src={vendor.logoUrl} alt="" className="h-14 w-14 rounded object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded bg-[#1E3A5F]/10 flex items-center justify-center text-xl font-bold text-[#1E3A5F]">
                    {vendor.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-[#1E3A5F] truncate">{vendor.businessName}</h2>
                  <p className="text-sm text-gray-500 truncate">
                    {vendor.contactFirstName} {vendor.contactLastName} · {vendor.email}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <StatusBadge status={vendor.status} />
                    {vendor.status === 'approved' && <PaymentBadge status={vendor.paymentStatus} />}
                    {vendor.status === 'approved' && balance > 0 && (
                      <span className="text-xs text-amber-700">{money(balance)} due</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                {vendor.status === 'pending' && (
                  <Button size="sm" onClick={() => actions.review(vendor)} className="bg-green-600 hover:bg-green-700 text-white">
                    <ClipboardCheck className="h-4 w-4 mr-1" /> Review &amp; Approve
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => actions.email(vendor)}>
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
                {vendor.status === 'approved' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => actions.recordPayment(vendor, false)}>
                      <DollarSign className="h-4 w-4 mr-1" /> Record Payment
                    </Button>
                    {balance > 0 && (
                      <Button size="sm" variant="outline" onClick={() => sendInvoice('reminder')} disabled={busy === 'reminder'}>
                        {busy === 'reminder' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BellRing className="h-4 w-4 mr-1" />}
                        Remind
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="px-6 py-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payments">Invoice &amp; Pay</TabsTrigger>
                <TabsTrigger value="staff">Staff ({vendor.boothStaff.length})</TabsTrigger>
                <TabsTrigger value="activity">Notes &amp; Log</TabsTrigger>
              </TabsList>

              {/* ================= OVERVIEW ================= */}
              <TabsContent value="overview" className="space-y-5 mt-4">
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-[#1E3A5F]">Business &amp; Contact</h3>
                    {!editing && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                  {editing ? (
                    <div className="space-y-3 text-sm">
                      <div>
                        <Label>Business Name</Label>
                        <Input value={field('businessName')} onChange={(e) => setEdits((p) => ({ ...p, businessName: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Contact First</Label>
                          <Input value={field('contactFirstName')} onChange={(e) => setEdits((p) => ({ ...p, contactFirstName: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Contact Last</Label>
                          <Input value={field('contactLastName')} onChange={(e) => setEdits((p) => ({ ...p, contactLastName: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Email</Label>
                          <Input value={field('email')} onChange={(e) => setEdits((p) => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input value={field('phone')} onChange={(e) => setEdits((p) => ({ ...p, phone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Booth Type</Label>
                          {tiers.length > 0 && (
                            <select
                              value={tiers.find((t) => t.name === field('selectedTier'))?.id || ''}
                              onChange={(e) => pickTier(e.target.value)}
                              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm mb-1"
                            >
                              <option value="">Custom…</option>
                              {tiers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (${t.price.toFixed(2)})
                                </option>
                              ))}
                            </select>
                          )}
                          <Input value={field('selectedTier')} onChange={(e) => setEdits((p) => ({ ...p, selectedTier: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Booth Price</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="pl-7"
                              value={field('tierPrice')}
                              onChange={(e) => setEdits((p) => ({ ...p, tierPrice: e.target.value }))}
                            />
                          </div>
                          {vendor.status === 'approved' && (
                            <p className="text-xs text-gray-500 mt-1">Doesn&apos;t change the invoice. Edit it under Invoice &amp; Pay.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Booth Description</Label>
                        <Textarea rows={3} value={field('boothDescription')} onChange={(e) => setEdits((p) => ({ ...p, boothDescription: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Additional Needs</Label>
                        <Textarea rows={2} value={field('additionalNeeds')} onChange={(e) => setEdits((p) => ({ ...p, additionalNeeds: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setEditing(false); setEdits({}) }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEdits} disabled={saving || Object.keys(edits).length === 0} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
                          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                      <dt className="text-gray-500">Contact</dt>
                      <dd>{vendor.contactFirstName} {vendor.contactLastName}</dd>
                      <dt className="text-gray-500">Email</dt>
                      <dd><a href={`mailto:${vendor.email}`} className="text-[#1E3A5F] underline">{vendor.email}</a></dd>
                      <dt className="text-gray-500">Phone</dt>
                      <dd>{vendor.phone ? <a href={`tel:${vendor.phone}`} className="text-[#1E3A5F] underline">{vendor.phone}</a> : '—'}</dd>
                      <dt className="text-gray-500">Booth Type</dt>
                      <dd>{vendor.selectedTier} ({money(vendor.tierPrice)})</dd>
                      <dt className="text-gray-500">Description</dt>
                      <dd className="whitespace-pre-wrap">{vendor.boothDescription || '—'}</dd>
                      {vendor.additionalNeeds && (
                        <>
                          <dt className="text-gray-500">Additional Needs</dt>
                          <dd className="whitespace-pre-wrap">{vendor.additionalNeeds}</dd>
                        </>
                      )}
                      <dt className="text-gray-500">Applied</dt>
                      <dd>{format(new Date(vendor.createdAt), 'MMM d, yyyy')}</dd>
                      {vendor.approvedAt && (
                        <>
                          <dt className="text-gray-500">Approved</dt>
                          <dd>{format(new Date(vendor.approvedAt), 'MMM d, yyyy')}</dd>
                        </>
                      )}
                    </dl>
                  )}
                </section>

                {vendor.status === 'rejected' && vendor.rejectionReason && (
                  <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                    <p className="font-medium text-red-700">Rejection reason</p>
                    <p className="text-red-800">{vendor.rejectionReason}</p>
                  </section>
                )}

                {vendor.customAnswers && vendor.customAnswers.length > 0 && (
                  <section className="border-t pt-4">
                    <h3 className="font-semibold text-[#1E3A5F] mb-2">Application Answers</h3>
                    <div className="space-y-2 text-sm">
                      {vendor.customAnswers.map((a, i) => (
                        <div key={i}>
                          <p className="text-gray-500">{a.questionText}</p>
                          <p className="font-medium">{a.answerText || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {vendor.status === 'approved' && (
                  <section className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#1E3A5F]">Codes &amp; Compliance</h3>
                      <Button size="sm" variant="ghost" onClick={() => actions.resendCodes(vendor)}>
                        <Send className="h-4 w-4 mr-1" /> Email codes
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {[
                        { label: 'Vendor code (for booth staff)', value: vendor.vendorCode },
                        { label: 'Portal access code', value: vendor.accessCode },
                        ...(vendor.porosAccessCode ? [{ label: 'Liability form code', value: vendor.porosAccessCode }] : []),
                      ].map((c) => (
                        <div key={c.label} className="rounded border bg-gray-50 p-2">
                          <p className="text-xs text-gray-500">{c.label}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold">{c.value}</span>
                            <button onClick={() => copy(c.value, c.label)} className="text-gray-500 hover:text-[#1E3A5F]" title="Copy">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm items-center">
                      {vendor.porosAccessCode && (
                        vendor.liabilityForm?.completed ? (
                          <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Liability form complete</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">Liability form pending</Badge>
                        )
                      )}
                      {vendor.safeEnvironmentCertUrl ? (
                        <a href={vendor.safeEnvironmentCertUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-green-700 hover:underline">
                          <Shield className="h-4 w-4 mr-1" /> Safe Env certificate on file
                        </a>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => actions.uploadCert(vendor)}>
                          <Upload className="h-4 w-4 mr-1" /> Upload Safe Env cert
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      <KeyRound className="h-3 w-3 inline mr-1" />
                      Vendor portal: {typeof window !== 'undefined' ? window.location.origin : ''}/vendor-dashboard?code={vendor.accessCode}
                    </p>
                  </section>
                )}

                {/* Danger zone */}
                <section className="border-t pt-4">
                  <h3 className="font-semibold text-[#1E3A5F] mb-2">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.status === 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => actions.moveToPending(vendor)}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Re-open application
                      </Button>
                    )}
                    {vendor.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => actions.moveToPending(vendor)}>
                        <Undo2 className="h-4 w-4 mr-1" /> Move back to pending
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => actions.remove(vendor)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete vendor
                    </Button>
                  </div>
                </section>
              </TabsContent>

              {/* ================= INVOICE & PAYMENTS ================= */}
              <TabsContent value="payments" className="space-y-5 mt-4">
                {vendor.status !== 'approved' ? (
                  <div className="rounded-md border bg-gray-50 p-4 text-sm text-gray-600">
                    An invoice is created when the vendor is approved.
                    {vendor.status === 'pending' && (
                      <Button size="sm" className="ml-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => actions.review(vendor)}>
                        Review &amp; Approve
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-gray-500">Invoice</p>
                        <p className="text-lg font-bold text-[#1E3A5F]">{money(vendor.invoiceTotal)}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-lg font-bold text-green-600">{money(vendor.amountPaid)}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-gray-500">{balance < 0 ? 'Overpaid' : 'Balance'}</p>
                        <p className={`text-lg font-bold ${balance > 0 ? 'text-amber-600' : balance < 0 ? 'text-blue-600' : 'text-gray-700'}`}>
                          {money(Math.abs(balance))}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => actions.recordPayment(vendor, false)}>
                        <DollarSign className="h-4 w-4 mr-1" /> Record payment
                      </Button>
                      {balance > 0 && (
                        <Button size="sm" variant="outline" onClick={() => actions.recordPayment(vendor, true)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Mark as paid
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => sendInvoice('invoice')} disabled={busy === 'invoice'}>
                        {busy === 'invoice' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                        Resend invoice
                      </Button>
                      {balance > 0 && (
                        <Button size="sm" variant="outline" onClick={() => sendInvoice('reminder')} disabled={busy === 'reminder'}>
                          <BellRing className="h-4 w-4 mr-1" /> Payment reminder
                        </Button>
                      )}
                      {Number(vendor.amountPaid || 0) > 0 && (
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => actions.refund(vendor)}>
                          <Undo2 className="h-4 w-4 mr-1" /> Refund
                        </Button>
                      )}
                    </div>

                    {/* Invoice */}
                    <section className="rounded-md border">
                      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                        <h3 className="font-semibold text-[#1E3A5F]">Invoice</h3>
                        {!editingInvoice && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={startInvoiceEdit}>
                              <Pencil className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            {Number(vendor.invoiceTotal || 0) > 0 && (
                              <Button size="sm" variant="ghost" onClick={() => saveInvoice(true)} disabled={busy === 'waive'}>
                                <Gift className="h-4 w-4 mr-1" /> Waive fee
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-4 text-sm">
                        {editingInvoice ? (
                          <div className="space-y-2">
                            {lineItems.map((item, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  placeholder="Description"
                                  value={item.description}
                                  onChange={(e) => {
                                    const next = [...lineItems]
                                    next[index] = { ...next[index], description: e.target.value }
                                    setLineItems(next)
                                  }}
                                  className="flex-1"
                                />
                                <div className="relative w-32">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.amount}
                                    onChange={(e) => {
                                      const next = [...lineItems]
                                      next[index] = { ...next[index], amount: Number(e.target.value) }
                                      setLineItems(next)
                                    }}
                                    className="pl-7"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={lineItems.length === 1}
                                  onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { description: '', amount: 0 }])}>
                                <Plus className="h-4 w-4 mr-1" /> Add line
                              </Button>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2">
                              <span>New total</span>
                              <span>{money(invoiceTotalDraft)}</span>
                            </div>
                            {Number(vendor.amountPaid || 0) > 0 && (
                              <p className="text-xs text-gray-500">
                                Already paid {money(vendor.amountPaid)} → new balance {money(invoiceTotalDraft - Number(vendor.amountPaid))}
                              </p>
                            )}
                            <div>
                              <Label>Invoice notes (shown to vendor)</Label>
                              <Textarea rows={2} value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={emailInvoice} onChange={(e) => setEmailInvoice(e.target.checked)} />
                              Email the updated invoice to the vendor
                            </label>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingInvoice(false)}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => saveInvoice(false)} disabled={busy === 'invoice'} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
                                {busy === 'invoice' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Invoice
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <table className="w-full">
                              <tbody>
                                {(vendor.invoiceLineItems || []).map((item, i) => (
                                  <tr key={i} className="border-b last:border-0">
                                    <td className="py-1.5">{item.description}</td>
                                    <td className="py-1.5 text-right">{money(item.amount)}</td>
                                  </tr>
                                ))}
                                <tr className="font-bold">
                                  <td className="pt-2">Total</td>
                                  <td className="pt-2 text-right">{money(vendor.invoiceTotal)}</td>
                                </tr>
                              </tbody>
                            </table>
                            {vendor.invoiceNotes && <p className="text-xs text-gray-500 mt-2">Notes: {vendor.invoiceNotes}</p>}
                          </>
                        )}
                      </div>
                    </section>

                    {/* Payment history */}
                    <section>
                      <h3 className="font-semibold text-[#1E3A5F] mb-2">Payment History</h3>
                      {data!.payments.length === 0 && data!.refunds.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {Number(vendor.amountPaid || 0) > 0
                            ? `${money(vendor.amountPaid)} paid online through the vendor portal.`
                            : 'No payments yet.'}
                        </p>
                      ) : (
                        <div className="space-y-2 text-sm">
                          {[
                            ...data!.payments.map((p) => ({
                              id: p.id,
                              at: p.processedAt || p.createdAt,
                              amount: Number(p.amount),
                              label: `${METHOD_LABELS[p.paymentMethod] || p.paymentMethod} payment${p.checkNumber ? ` · check #${p.checkNumber}` : ''}`,
                              by: who(p.processedBy),
                              notes: p.notes,
                            })),
                            ...data!.refunds.map((r) => ({
                              id: r.id,
                              at: r.createdAt,
                              amount: -Number(r.refundAmount),
                              label: `Refund (${METHOD_LABELS[r.refundMethod] || r.refundMethod}) · ${r.refundReason.replace(/_/g, ' ')}${r.status !== 'completed' ? ` · ${r.status}` : ''}`,
                              by: who(r.processedBy),
                              notes: r.notes,
                            })),
                          ]
                            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                            .map((row) => (
                              <div key={row.id} className="flex justify-between rounded border px-3 py-2">
                                <div>
                                  <p className="font-medium">{row.label}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(row.at), 'MMM d, yyyy')} · {row.by}
                                  </p>
                                  {row.notes && <p className="text-xs text-gray-600 mt-1">{row.notes}</p>}
                                </div>
                                <span className={`font-semibold ${row.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {row.amount < 0 ? '-' : '+'}
                                  {money(Math.abs(row.amount))}
                                </span>
                              </div>
                            ))}
                          <p className="text-xs text-gray-500">Online card payments made in the vendor portal are included in the Paid total.</p>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </TabsContent>

              {/* ================= BOOTH STAFF ================= */}
              <TabsContent value="staff" className="mt-4">
                {vendor.boothStaff.length === 0 ? (
                  <div className="text-sm text-gray-500 rounded-md border bg-gray-50 p-4">
                    No booth staff registered yet.
                    {vendor.status === 'approved' && (
                      <> They register with vendor code <span className="font-mono font-semibold">{vendor.vendorCode}</span>.</>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendor.boothStaff.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">
                            {s.firstName} {s.lastName}
                            {s.checkedIn && <Badge className="ml-2 bg-green-500">Checked in</Badge>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.role} · <a href={`mailto:${s.email}`} className="underline">{s.email}</a>
                            {s.phone ? ` · ${s.phone}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">{format(new Date(s.createdAt), 'MMM d')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ================= NOTES & ACTIVITY ================= */}
              <TabsContent value="activity" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="vendor-note">Add a private note</Label>
                  <Textarea
                    id="vendor-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Only admins see this, e.g. “Needs a corner booth near power”"
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={addNote} disabled={!note.trim() || busy === 'note'} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
                      {busy === 'note' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <StickyNote className="h-4 w-4 mr-1" />}
                      Add Note
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-gray-500">No activity yet.</p>
                  ) : (
                    timeline.map((t) => (
                      <div
                        key={t.id}
                        className={`rounded border px-3 py-2 text-sm ${t.isNote ? 'bg-yellow-50 border-yellow-200' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {t.icon === 'email' ? (
                            <Mail className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                          ) : t.icon === 'note' ? (
                            <StickyNote className="h-4 w-4 mt-0.5 text-yellow-600 shrink-0" />
                          ) : (
                            <Pencil className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {t.isNote ? (
                              <p className="whitespace-pre-wrap">{t.note}</p>
                            ) : (
                              <>
                                <p>{t.text}</p>
                                {t.note && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{t.note}</p>}
                              </>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(t.at), 'MMM d, yyyy h:mm a')} · {t.by}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
