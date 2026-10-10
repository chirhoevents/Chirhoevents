'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Pencil, Download, Mail, Copy, Search, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { downloadFromApi } from '@/lib/lux/download'
import { formatEventDate, formatMoney, gradeLabel, GRADE_OPTIONS } from '@/lib/lux/format'
import { DOCUMENT_STATUS_LABELS, ORDER_STATUS_LABELS, PROGRAM_STATUS_LABELS } from '@/lib/lux/program-status'
import OrderPanel from '@/components/lux/OrderPanel'
import DocumentPanel, { DOC_TONE, type PanelDocument } from '@/components/lux/DocumentPanel'
import {
  Badge, Button, Card, ErrorNote, Field, Modal, PageHeader, Select, Spinner, StatCard, Tabs, TextArea, TextInput,
} from '@/components/lux/ui'

interface Requirement { id: string; key: string; label: string; required: boolean; allowParishLookup: boolean }
interface RosterEntry {
  id: string
  status: string
  cancelledAt: string | null
  grade: string | null
  feeAmount: number
  discountAmount: number
  answers: Record<string, unknown> | null
  sponsorInfo: Record<string, string> | null
  serviceHoursCompleted: number | null
  staffNotes: string | null
  child: {
    id: string; firstName: string; lastName: string; dateOfBirth: string | null; gender: string | null; baptized: boolean | null
    baptismDate: string | null; baptismParish: string | null; baptismCity: string | null; baptizedAtThisParish: boolean
    allergies: string | null; medicalNotes: string | null; school: string | null; firstCommunionDate: string | null; firstCommunionParish: string | null
  }
  household: { id: string; guardian1FirstName: string; guardian1LastName: string; guardian2FirstName: string | null; guardian2LastName: string | null; email: string; phone: string }
  order: { id: string; status: string; confirmationCode: string; amountDue: number; amountPaid: number; feeAssistanceStatus: string } | null
  documents: Array<PanelDocument & { requirementId: string }>
  documentSummary: { required: number; done: number; outstandingFromFamily: number; awaitingStaff: number }
}
interface RosterData {
  program: { id: string; name: string; term: string; collectSponsor: boolean; collectServiceHours: boolean; serviceHoursRequired: number | null; questions: Array<{ id: string; label: string }> }
  requirements: Requirement[]
  registrations: RosterEntry[]
}
interface ProgramMeta { id: string; name: string; term: string; status: string; isOpen: boolean; capacity: number | null; registered: number; slug: string; registrationClosesAt: string | null }

const paymentTone = (status?: string) =>
  status === 'paid' || status === 'waived' ? 'green' : status === 'assistance_requested' ? 'blue' : status ? 'amber' : 'gray'

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const api = useLuxApi()
  const { getToken } = useAuth()
  const { info } = useLux()
  const [meta, setMeta] = useState<ProgramMeta | null>(null)
  const [data, setData] = useState<RosterData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'roster' | 'documents'>('roster')
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [payment, setPayment] = useState('')
  const [docs, setDocs] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [panel, setPanel] = useState<{ doc: PanelDocument; label: string; childName: string } | null>(null)
  const [cancelling, setCancelling] = useState<RosterEntry | null>(null)
  const [orderOpen, setOrderOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api(`/api/lux/programs/${id}`), api(`/api/lux/programs/${id}/roster`)])
      setMeta(p.program)
      setData(r)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [api, id])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.registrations.filter(r => {
      if (q && !`${r.child.firstName} ${r.child.lastName} ${r.household.guardian1FirstName} ${r.household.guardian1LastName} ${r.household.email}`.toLowerCase().includes(q)) return false
      if (grade && r.grade !== grade) return false
      if (payment === 'paid' && !['paid', 'waived'].includes(r.order?.status ?? '')) return false
      if (payment === 'owes' && ['paid', 'waived'].includes(r.order?.status ?? '')) return false
      if (payment === 'assistance' && r.order?.feeAssistanceStatus !== 'requested') return false
      if (docs === 'complete' && r.documentSummary.outstandingFromFamily > 0) return false
      if (docs === 'missing' && r.documentSummary.outstandingFromFamily === 0) return false
      if (docs === 'review' && r.documentSummary.awaitingStaff === 0) return false
      return true
    })
  }, [data, query, grade, payment, docs])

  const stats = useMemo(() => {
    const regs = data?.registrations ?? []
    return {
      unpaid: regs.filter(r => r.order && !['paid', 'waived'].includes(r.order.status)).length,
      missingDocs: regs.filter(r => r.documentSummary.outstandingFromFamily > 0).length,
      toReview: regs.reduce((s, r) => s + r.documentSummary.awaitingStaff, 0),
      assistance: regs.filter(r => r.order?.feeAssistanceStatus === 'requested').length,
    }
  }, [data])

  const setStatus = async (status: string, message: string) => {
    setBusy(status)
    try {
      await api(`/api/lux/programs/${id}/status`, { method: 'POST', json: { status } })
      toast.success(message)
      load()
    } catch (e) {
      toast.error((e as Error).message, { duration: 6000 })
    } finally {
      setBusy(null)
    }
  }

  const remindAll = async () => {
    if (!confirm(`Email every family in this program that still owes a required document?`)) return
    setBusy('remind')
    try {
      const result = await api('/api/lux/reminders', { method: 'POST', json: { programId: id } })
      toast.success(result.families ? `Reminders sent to ${result.sent} of ${result.families} families` : 'Every family is caught up!')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const deleteProgram = async () => {
    if (!confirm('Delete this program? This can’t be undone.')) return
    try {
      await api(`/api/lux/programs/${id}`, { method: 'DELETE' })
      toast.success('Program deleted')
      router.push('/dashboard/lux/programs')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (error) return <ErrorNote message={error} />
  if (!meta || !data) return <Spinner label="Loading program…" />

  const parishUrl = typeof window !== 'undefined' ? `${window.location.origin}/lux/${info.publicSlug}?program=${meta.slug}` : ''
  const exportUrl = (kind: string, extra = '') => `/api/lux/exports/${kind}?programId=${id}${extra}`
  const docFor = (r: RosterEntry, reqId: string) => r.documents.find(d => d.requirementId === reqId)

  return (
    <div className="space-y-5">
      <PageHeader
        title={meta.name}
        back={{ href: '/dashboard/lux/programs', label: 'Programs & Events' }}
        description={<span className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.status === 'open' ? (meta.isOpen ? 'green' : 'blue') : meta.status === 'draft' ? 'gray' : 'red'}>
            {meta.status === 'open' && !meta.isOpen ? 'Open (outside registration dates)' : PROGRAM_STATUS_LABELS[meta.status]}
          </Badge>
          <span>{meta.term}</span>
          {meta.registrationClosesAt && <span>· Registration closes {formatEventDate(meta.registrationClosesAt, { timeZone: undefined })}</span>}
        </span>}
        actions={info.canManage && <>
          <Button variant="secondary" href={`/dashboard/lux/programs/${id}/edit`}><Pencil className="h-4 w-4" /> Edit</Button>
          {meta.status === 'draft' && <Button variant="gold" loading={busy === 'open'} onClick={() => setStatus('open', 'Registration is open!')}>Open registration</Button>}
          {meta.status === 'open' && <Button variant="secondary" loading={busy === 'closed'} onClick={() => setStatus('closed', 'Registration closed')}>Close registration</Button>}
          {meta.status === 'closed' && <>
            <Button variant="secondary" loading={busy === 'open'} onClick={() => setStatus('open', 'Registration reopened')}>Reopen</Button>
            <Button variant="ghost" loading={busy === 'archived'} onClick={() => setStatus('archived', 'Archived')}>Archive</Button>
          </>}
        </>}
      />

      {meta.status !== 'draft' && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Families register at your parish page</p>
              <p className="font-mono text-sm text-[#1E3A5F] truncate">{parishUrl}</p>
            </div>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(parishUrl); toast.success('Link copied') }}><Copy className="h-4 w-4" /> Copy link</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Children registered" value={meta.registered} hint={meta.capacity ? `of ${meta.capacity}` : undefined} />
        <StatCard label="Not paid yet" value={stats.unpaid} tone={stats.unpaid ? 'warn' : 'default'} hint={stats.assistance ? `${stats.assistance} asked for fee assistance` : undefined} />
        <StatCard label="Missing documents" value={stats.missingDocs} tone={stats.missingDocs ? 'warn' : 'good'} hint="children" />
        <StatCard label="Waiting for your review" value={stats.toReview} tone={stats.toReview ? 'warn' : 'default'} hint="documents" />
      </div>

      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'roster', label: 'Roster' }, { value: 'documents', label: 'Documents checklist' }]} />

        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <TextInput className="pl-9" placeholder="Search child or parent" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <Select value={grade} onChange={e => setGrade(e.target.value)} className="lg:w-36">
            <option value="">All grades</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}
          </Select>
          <Select value={payment} onChange={e => setPayment(e.target.value)} className="lg:w-44">
            <option value="">Any payment</option>
            <option value="paid">Paid</option>
            <option value="owes">Not paid</option>
            <option value="assistance">Asked for assistance</option>
          </Select>
          <Select value={docs} onChange={e => setDocs(e.target.value)} className="lg:w-48">
            <option value="">Any documents</option>
            <option value="complete">All documents in</option>
            <option value="missing">Missing documents</option>
            <option value="review">Waiting for review</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="secondary" onClick={() => downloadFromApi(getToken, exportUrl('program-roster', grade ? `&grade=${grade}` : '') + (payment ? `&payment=${payment === 'assistance' ? 'owes' : payment}` : '') + (docs && docs !== 'review' ? `&docs=${docs}` : ''), 'roster.csv').catch(e => toast.error(e.message))}>
            <Download className="h-4 w-4" /> Export roster
          </Button>
          <Button variant="secondary" onClick={() => downloadFromApi(getToken, exportUrl('outstanding-documents'), 'outstanding-documents.csv').catch(e => toast.error(e.message))}>
            <Download className="h-4 w-4" /> Export missing documents
          </Button>
          {info.canManage && stats.missingDocs > 0 && (
            <Button onClick={remindAll} loading={busy === 'remind'}><Mail className="h-4 w-4" /> Remind families missing documents ({stats.missingDocs})</Button>
          )}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">{data.registrations.length === 0 ? 'No one has registered yet.' : 'No matches.'}</p>
        )}

        {tab === 'roster' && filtered.length > 0 && (
          <div className="divide-y divide-[#F0EBDF] -mx-5">
            {filtered.map(r => {
              const open = expanded === r.id
              return (
                <div key={r.id}>
                  <button type="button" onClick={() => setExpanded(open ? null : r.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#FAF8F3]">
                    {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1E3A5F] truncate">{r.child.firstName} {r.child.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{gradeLabel(r.grade)} · {r.household.guardian1FirstName} {r.household.guardian1LastName}</p>
                    </div>
                    <div className="hidden sm:block w-32 text-right">
                      <Badge tone={r.documentSummary.outstandingFromFamily ? 'amber' : r.documentSummary.awaitingStaff ? 'blue' : 'green'}>
                        {r.documentSummary.required === 0 ? 'No documents' : `${r.documentSummary.done}/${r.documentSummary.required} documents`}
                      </Badge>
                    </div>
                    <div className="w-36 text-right">
                      <Badge tone={paymentTone(r.order?.status)}>{r.order ? ORDER_STATUS_LABELS[r.order.status] ?? r.order.status : '—'}</Badge>
                    </div>
                  </button>
                  {open && (
                    <div className="px-12 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p><span className="text-gray-500">Family</span> <Link className="underline" href={`/dashboard/lux/households/${r.household.id}`}>{r.household.guardian1FirstName} {r.household.guardian1LastName}{r.household.guardian2FirstName ? ` & ${r.household.guardian2FirstName}` : ''}</Link></p>
                        <p><span className="text-gray-500">Contact</span> {r.household.email} · {r.household.phone}</p>
                        {r.child.dateOfBirth && <p><span className="text-gray-500">Born</span> {formatEventDate(r.child.dateOfBirth, { weekday: undefined })}</p>}
                        {r.child.school && <p><span className="text-gray-500">School</span> {r.child.school}</p>}
                        <p><span className="text-gray-500">Baptism</span> {r.child.baptizedAtThisParish ? 'At this parish' : r.child.baptized === false ? 'Not baptized' :
                          [r.child.baptismDate && formatEventDate(r.child.baptismDate, { weekday: undefined }), r.child.baptismParish, r.child.baptismCity].filter(Boolean).join(', ') || 'Not given'}</p>
                        {r.child.firstCommunionDate && <p><span className="text-gray-500">First Communion</span> {formatEventDate(r.child.firstCommunionDate, { weekday: undefined })}{r.child.firstCommunionParish ? `, ${r.child.firstCommunionParish}` : ''}</p>}
                        {(r.child.allergies || r.child.medicalNotes) && (
                          <div className="rounded-lg bg-red-50 px-3 py-2 mt-1">
                            {r.child.allergies && <p><span className="text-gray-600">Allergies:</span> {r.child.allergies}</p>}
                            {r.child.medicalNotes && <p><span className="text-gray-600">Medical:</span> {r.child.medicalNotes}</p>}
                          </div>
                        )}
                        {data.program.questions.map(q => r.answers?.[q.id] ? (
                          <p key={q.id}><span className="text-gray-500">{q.label}</span> {Array.isArray(r.answers[q.id]) ? (r.answers[q.id] as string[]).join(', ') : String(r.answers[q.id])}</p>
                        ) : null)}
                        {data.program.collectSponsor && r.sponsorInfo && (
                          <p><span className="text-gray-500">Sponsor</span> {r.sponsorInfo.name}{r.sponsorInfo.parish ? ` (${r.sponsorInfo.parish})` : ''}{r.sponsorInfo.email ? ` · ${r.sponsorInfo.email}` : ''}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p><span className="text-gray-500">Fee</span> {formatMoney(r.feeAmount)}{r.discountAmount > 0 ? ` (after ${formatMoney(r.discountAmount)} discount)` : ''}</p>
                        {r.order && (
                          <p>
                            <span className="text-gray-500">Paid</span> {formatMoney(r.order.amountPaid)} of {formatMoney(r.order.amountDue)}{' '}
                            <button type="button" className="text-[#9C8466] hover:text-[#1E3A5F] underline" onClick={() => setOrderOpen(r.order!.id)}>
                              {r.order.feeAssistanceStatus === 'requested' ? 'Review fee assistance' : 'Payments'}
                            </button>
                          </p>
                        )}
                        <div className="space-y-1">
                          {data.requirements.map(req => {
                            const d = docFor(r, req.id)
                            return (
                              <button key={req.id} type="button" className="flex items-center justify-between w-full text-left hover:bg-[#FAF8F3] rounded px-2 py-1"
                                onClick={() => d && setPanel({ doc: d, label: req.label, childName: r.child.firstName })}>
                                <span>{req.label}{!req.required && <span className="text-gray-400"> (optional)</span>}</span>
                                <Badge tone={DOC_TONE[d?.status ?? 'missing']}>{DOCUMENT_STATUS_LABELS[d?.status ?? 'missing']}</Badge>
                              </button>
                            )
                          })}
                        </div>
                        {data.program.collectServiceHours && <ServiceHours entry={r} required={data.program.serviceHoursRequired} onSaved={load} />}
                        <StaffNotes entry={r} onSaved={load} />
                        {info.canManage && !r.cancelledAt && (
                          <Button variant="danger" onClick={() => setCancelling(r)}><Trash2 className="h-4 w-4" /> Cancel registration</Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'documents' && filtered.length > 0 && (
          <div className="overflow-x-auto -mx-5">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#F0EBDF]">
                  <th className="px-5 py-2 font-medium">Child</th>
                  {data.requirements.map(req => <th key={req.id} className="px-3 py-2 font-medium whitespace-nowrap">{req.label}{!req.required && ' (opt.)'}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBDF]">
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="px-5 py-2 whitespace-nowrap">
                      <p className="font-medium text-[#1E3A5F]">{r.child.firstName} {r.child.lastName}</p>
                      <p className="text-xs text-gray-500">{gradeLabel(r.grade)}</p>
                    </td>
                    {data.requirements.map(req => {
                      const d = docFor(r, req.id)
                      return (
                        <td key={req.id} className="px-3 py-2">
                          {d ? (
                            <button type="button" onClick={() => setPanel({ doc: d, label: req.label, childName: `${r.child.firstName} ${r.child.lastName}` })}>
                              <Badge tone={DOC_TONE[d.status]}>{DOCUMENT_STATUS_LABELS[d.status]}</Badge>
                            </button>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {info.canManage && meta.registered === 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">No families have registered. Don’t need this program?</p>
            <Button variant="danger" onClick={deleteProgram}><Trash2 className="h-4 w-4" /> Delete program</Button>
          </div>
        </Card>
      )}

      {panel && <DocumentPanel document={panel.doc} label={panel.label} childName={panel.childName} onClose={() => setPanel(null)} onChanged={load} />}
      <CancelRegistrationModal entry={cancelling} onClose={() => setCancelling(null)} onDone={load} />
      <OrderPanel orderId={orderOpen} onClose={() => setOrderOpen(null)} onChanged={load} />
    </div>
  )
}

function ServiceHours({ entry, required, onSaved }: { entry: RosterEntry; required: number | null; onSaved: () => void }) {
  const api = useLuxApi()
  const { info } = useLux()
  const [hours, setHours] = useState(entry.serviceHoursCompleted?.toString() ?? '')
  const save = async () => {
    try {
      await api(`/api/lux/program-registrations/${entry.id}`, { method: 'PATCH', json: { serviceHoursCompleted: hours === '' ? null : Number(hours) } })
      toast.success('Service hours saved')
      onSaved()
    } catch (e) { toast.error((e as Error).message) }
  }
  return (
    <div className="flex items-end gap-2">
      <Field label={`Service hours${required ? ` (of ${required})` : ''}`} className="w-40">
        <TextInput type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} disabled={!info.canManage} />
      </Field>
      {info.canManage && <Button variant="secondary" onClick={save}>Save</Button>}
    </div>
  )
}

function StaffNotes({ entry, onSaved }: { entry: RosterEntry; onSaved: () => void }) {
  const api = useLuxApi()
  const { info } = useLux()
  const [notes, setNotes] = useState(entry.staffNotes ?? '')
  const [dirty, setDirty] = useState(false)
  const save = async () => {
    try {
      await api(`/api/lux/program-registrations/${entry.id}`, { method: 'PATCH', json: { staffNotes: notes } })
      toast.success('Note saved')
      setDirty(false)
      onSaved()
    } catch (e) { toast.error((e as Error).message) }
  }
  return (
    <div>
      <Field label="Staff notes" hint="Only your team sees these.">
        <TextArea rows={2} value={notes} onChange={e => { setNotes(e.target.value); setDirty(true) }} disabled={!info.canManage} />
      </Field>
      {dirty && <Button variant="secondary" className="mt-1" onClick={save}>Save note</Button>}
    </div>
  )
}

function CancelRegistrationModal({ entry, onClose, onDone }: { entry: RosterEntry | null; onClose: () => void; onDone: () => void }) {
  const api = useLuxApi()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => setReason(''), [entry])
  const cancel = async () => {
    if (!entry) return
    setSaving(true)
    try {
      await api(`/api/lux/program-registrations/${entry.id}`, { method: 'PATCH', json: { action: 'cancel', reason } })
      toast.success('Registration cancelled')
      onClose()
      onDone()
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }
  return (
    <Modal open={!!entry} onClose={onClose} title="Cancel this registration?"
      footer={<><Button variant="ghost" onClick={onClose}>Keep it</Button><Button variant="danger" onClick={cancel} loading={saving}>Cancel registration</Button></>}>
      <p className="text-sm text-gray-700 mb-3">
        {entry?.child.firstName} will be removed from the roster and their spot opened up. If the family hasn’t paid yet, {formatMoney(entry?.feeAmount ?? 0)} comes off what they owe.
        Payments already made stay on record; refund them from your Stripe dashboard if needed.
      </p>
      <Field label="Reason" hint="Optional, saved in staff notes"><TextInput value={reason} onChange={e => setReason(e.target.value)} /></Field>
    </Modal>
  )
}
