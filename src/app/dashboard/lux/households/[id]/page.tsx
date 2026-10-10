'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Pencil, Trash2, FileText, Receipt, StickyNote, Phone, MapPin, HeartPulse, Droplets } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import { formatMoney, formatShortDate, gradeLabel, GRADE_OPTIONS } from '@/lib/lux/format'
import { DOCUMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/lux/program-status'
import { Badge, Button, Card, ErrorNote, Field, Modal, PageHeader, Select, Spinner, TextArea, TextInput } from '@/components/lux/ui'
import DocumentPanel, { DOC_TONE, type PanelDocument } from '@/components/lux/DocumentPanel'
import OrderPanel, { ORDER_TONE } from '@/components/lux/OrderPanel'

interface Household {
  id: string
  guardian1FirstName: string; guardian1LastName: string; guardian1Relationship: string | null
  guardian2FirstName: string | null; guardian2LastName: string | null; guardian2Relationship: string | null
  guardian2Email: string | null; guardian2Phone: string | null
  email: string; phone: string; street: string | null; city: string | null; state: string | null; zip: string | null
  emergencyContactName: string | null; emergencyContactPhone: string | null
  registeredParishioner: boolean | null
  staffNotes: string | null
  createdAt: string
}
interface Child {
  id: string; firstName: string; lastName: string; dateOfBirth: string | null; gender: string | null; grade: string | null
  school: string | null; baptized: boolean | null; baptismDate: string | null; baptismParish: string | null; baptismCity: string | null
  baptizedAtThisParish: boolean; firstCommunionDate: string | null; firstCommunionParish: string | null
  allergies: string | null; medicalNotes: string | null; archived: boolean; isAdult: boolean
}
interface Registration {
  id: string; childId: string; orderId: string | null; programId: string; programName: string; programArchived: boolean
  term: string; grade: string | null; session: string | null; status: string; feeAmount: number
  documents: Array<PanelDocument & { label: string; required: boolean }>
}
interface Order {
  id: string; confirmationCode: string; status: string; total: number; amountDue: number; amountPaid: number; owed: number
  feeAssistanceStatus: string; createdAt: string
}
interface Data { household: Household; children: Child[]; registrations: Registration[]; orders: Order[] }

const REG_STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  registered: { label: 'Registered', tone: 'green' },
  pending_payment: { label: 'Waiting on payment', tone: 'amber' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
}

function age(dob: string | null): string | null {
  if (!dob) return null
  const d = new Date(`${dob}T00:00:00`)
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years--
  return `${years}`
}

export default function HouseholdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const api = useLuxApi()
  const { info } = useLux()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [openDoc, setOpenDoc] = useState<{ doc: PanelDocument; label: string; childName: string } | null>(null)
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(() => {
    api<Data>(`/api/lux/households/${id}`)
      .then(d => { setData(d); setNotes(d.household.staffNotes ?? '') })
      .catch(e => setError(e.message))
  }, [api, id])
  useEffect(() => { load() }, [load])

  if (error) return <ErrorNote message={error} />
  if (!data) return <Spinner />
  const { household: h, children, registrations, orders } = data

  const sendLink = async () => {
    setBusy('link')
    try {
      const r = await api<{ email: string }>(`/api/lux/households/${id}/link`, { method: 'POST' })
      toast.success(`Family link sent to ${r.email}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const saveNotes = async () => {
    setBusy('notes')
    try {
      await api(`/api/lux/households/${id}`, { method: 'PUT', json: { household: { ...h, staffNotes: notes } } })
      toast.success('Notes saved')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const deleteDocuments = async () => {
    const count = registrations.reduce((s, r) => s + r.documents.filter(d => d.hasFile).length, 0)
    if (count === 0) { toast.info('There are no files to delete.'); return }
    if (!confirm(`Permanently delete all ${count} file${count === 1 ? '' : 's'} this family uploaded? This can’t be undone. Documents you already approved stay marked approved.`)) return
    setBusy('delete')
    try {
      const r = await api<{ deleted: number }>(`/api/lux/households/${id}/documents`, { method: 'DELETE' })
      toast.success(`${r.deleted} file${r.deleted === 1 ? '' : 's'} deleted`)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const visibleChildren = children.filter(c => showArchived || !c.archived)
  const archivedCount = children.filter(c => c.archived).length
  const owed = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.owed, 0)

  return (
    <div className="space-y-6">
      <Link href="/dashboard/lux/households" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1E3A5F]"><ArrowLeft className="h-4 w-4" /> Households</Link>
      <PageHeader
        title={`${h.guardian1FirstName} ${h.guardian1LastName}${h.guardian2FirstName ? ` & ${h.guardian2FirstName} ${h.guardian2LastName ?? ''}` : ''}`}
        description={`On file since ${formatShortDate(h.createdAt)}${owed > 0 ? ` · owes ${formatMoney(owed)}` : ''}`}
        actions={info.canManage && (
          <>
            <Button variant="secondary" onClick={sendLink} loading={busy === 'link'}><Mail className="h-4 w-4" /> Email family link</Button>
            <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {visibleChildren.map(c => {
            const regs = registrations.filter(r => r.childId === c.id && (!r.programArchived || r.status !== 'cancelled'))
            return (
              <Card key={c.id} title={<span>{c.firstName} {c.lastName}{c.isAdult && <span className="ml-2"><Badge tone="blue">Adult</Badge></span>}{c.archived && <span className="ml-2"><Badge>Archived</Badge></span>}</span>}
                description={[!c.isAdult && c.grade && gradeLabel(c.grade), !c.isAdult && age(c.dateOfBirth) && `age ${age(c.dateOfBirth)}`, c.dateOfBirth && `born ${formatShortDate(c.dateOfBirth)}`, c.school].filter(Boolean).join(' · ')}>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p className="flex gap-2"><Droplets className="h-4 w-4 text-[#C8A24A] shrink-0 mt-0.5" />
                      <span>
                        {c.baptized === false ? 'Not baptized' : c.baptized === null ? 'Baptism not given' : (
                          <>Baptized{c.baptismDate ? ` ${formatShortDate(c.baptismDate)}` : ''}{c.baptizedAtThisParish ? ' here' : c.baptismParish ? ` at ${c.baptismParish}` : ''}{c.baptismCity ? `, ${c.baptismCity}` : ''}</>
                        )}
                        {c.firstCommunionDate && <span className="block text-gray-500">First Communion {formatShortDate(c.firstCommunionDate)}{c.firstCommunionParish ? ` at ${c.firstCommunionParish}` : ''}</span>}
                      </span>
                    </p>
                    {(c.allergies || c.medicalNotes) && (
                      <p className="flex gap-2"><HeartPulse className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{c.allergies && <span className="block"><strong>Allergies:</strong> {c.allergies}</span>}{c.medicalNotes && <span className="block"><strong>Medical:</strong> {c.medicalNotes}</span>}</span>
                      </p>
                    )}
                  </div>
                  {regs.length === 0 ? <p className="text-gray-500">Not registered for a current program.</p> : regs.map(r => (
                    <div key={r.id} className="rounded-lg border border-[#E8E2D4]">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#FAF8F3] rounded-t-lg">
                        <Link href={`/dashboard/lux/programs/${r.programId}`} className="font-medium text-[#1E3A5F] hover:underline">{r.programName} <span className="font-normal text-gray-500">· {r.term}{r.session ? ` · ${r.session}` : ''}</span></Link>
                        <span className="flex items-center gap-2"><span className="text-gray-600">{formatMoney(r.feeAmount)}</span><Badge tone={REG_STATUS[r.status]?.tone}>{REG_STATUS[r.status]?.label ?? r.status}</Badge></span>
                      </div>
                      {r.documents.length > 0 && r.status !== 'cancelled' && (
                        <div className="divide-y divide-[#F0EBDF]">
                          {r.documents.map(d => (
                            <button key={d.id} type="button" onClick={() => setOpenDoc({ doc: d, label: d.label, childName: c.firstName })}
                              className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#FDFBF5]">
                              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /> {d.label}{!d.required && <span className="text-xs text-gray-400">(optional)</span>}</span>
                              <Badge tone={DOC_TONE[d.status]}>{DOCUMENT_STATUS_LABELS[d.status] ?? d.status}</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
          {children.length === 0 && <Card><p className="text-sm text-gray-500">No children on file.</p></Card>}
          {archivedCount > 0 && (
            <button type="button" onClick={() => setShowArchived(v => !v)} className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">
              {showArchived ? 'Hide' : 'Show'} {archivedCount} archived child{archivedCount === 1 ? '' : 'ren'}
            </button>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <div className="text-sm space-y-3">
              <div>
                <p className="font-medium text-gray-900">{h.guardian1FirstName} {h.guardian1LastName}{h.guardian1Relationship ? <span className="font-normal text-gray-500"> ({h.guardian1Relationship})</span> : null}</p>
                <a href={`mailto:${h.email}`} className="block text-[#1E3A5F] hover:underline break-all">{h.email}</a>
                <a href={`tel:${h.phone}`} className="flex items-center gap-1 text-gray-700"><Phone className="h-3.5 w-3.5" /> {h.phone}</a>
              </div>
              {h.guardian2FirstName && (
                <div>
                  <p className="font-medium text-gray-900">{h.guardian2FirstName} {h.guardian2LastName}{h.guardian2Relationship ? <span className="font-normal text-gray-500"> ({h.guardian2Relationship})</span> : null}</p>
                  {h.guardian2Email && <a href={`mailto:${h.guardian2Email}`} className="block text-[#1E3A5F] hover:underline break-all">{h.guardian2Email}</a>}
                  {h.guardian2Phone && <p className="text-gray-700">{h.guardian2Phone}</p>}
                </div>
              )}
              {h.street && <p className="flex gap-1 text-gray-700"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {h.street}, {h.city} {h.state} {h.zip}</p>}
              {h.emergencyContactName && <p className="text-gray-700"><span className="text-gray-500">Emergency:</span> {h.emergencyContactName} {h.emergencyContactPhone}</p>}
              {h.registeredParishioner !== null && <p className="text-gray-700">{h.registeredParishioner ? 'Registered parishioners' : 'Not registered parishioners'}</p>}
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Receipt className="h-4 w-4 text-[#C8A24A]" /> Registrations &amp; payments</span>}>
            {orders.length === 0 ? <p className="text-sm text-gray-500">None yet.</p> : (
              <div className="divide-y divide-[#F0EBDF] -mx-5 text-sm">
                {orders.map(o => (
                  <button key={o.id} type="button" onClick={() => setOpenOrder(o.id)} className="w-full text-left flex items-center justify-between gap-2 px-5 py-2.5 hover:bg-[#FAF8F3]">
                    <span>
                      <span className="font-medium text-gray-900">#{o.confirmationCode}</span>
                      <span className="block text-xs text-gray-500">{formatShortDate(o.createdAt)} · {formatMoney(o.amountDue)}{o.owed > 0 ? ` · ${formatMoney(o.owed)} owed` : ''}</span>
                    </span>
                    <Badge tone={o.feeAssistanceStatus === 'requested' ? 'blue' : ORDER_TONE[o.status]}>
                      {o.feeAssistanceStatus === 'requested' ? 'Fee assistance' : ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-[#C8A24A]" /> Staff notes</span>} description="Only your staff see these.">
            <TextArea rows={4} value={notes} onChange={e => setNotes(e.target.value)} disabled={!info.canManage} placeholder="Custody notes, sacrament records checked, anything to remember." />
            {info.canManage && notes !== (h.staffNotes ?? '') && (
              <Button className="mt-2" onClick={saveNotes} loading={busy === 'notes'}>Save notes</Button>
            )}
          </Card>

          {info.canManage && (
            <Card title="Privacy">
              <p className="text-sm text-gray-600 mb-3">Delete every file this family has uploaded, for example when your records are complete or the family asks.</p>
              <Button variant="danger" onClick={deleteDocuments} loading={busy === 'delete'}><Trash2 className="h-4 w-4" /> Delete this family’s documents</Button>
            </Card>
          )}
        </div>
      </div>

      <DocumentPanel document={openDoc?.doc ?? null} label={openDoc?.label ?? ''} childName={openDoc?.childName ?? ''} onClose={() => setOpenDoc(null)} onChanged={load} />
      <OrderPanel orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={load} />
      {editing && <EditHouseholdModal data={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
    </div>
  )
}

type Editable<T> = { [K in keyof T]: T[K] extends boolean | null ? T[K] : string }

function EditHouseholdModal({ data, onClose, onSaved }: { data: Data; onClose: () => void; onSaved: () => void }) {
  const api = useLuxApi()
  const blank = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === null ? '' : v])) as Editable<T>
  const [h, setH] = useState(() => blank(data.household))
  const [kids, setKids] = useState(() => data.children.map(c => ({ ...blank(c), archived: c.archived, baptizedAtThisParish: c.baptizedAtThisParish, baptized: c.baptized })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hf = (key: keyof Household, label: string, type = 'text') => (
    <Field label={label}><TextInput type={type} value={String(h[key] ?? '')} onChange={e => setH({ ...h, [key]: e.target.value })} /></Field>
  )
  const setKid = (i: number, patch: Record<string, unknown>) => setKids(list => list.map((k, j) => (j === i ? { ...k, ...patch } : k)))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api(`/api/lux/households/${data.household.id}`, { method: 'PUT', json: { household: h, children: kids } })
      toast.success('Saved')
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open wide onClose={onClose} title="Edit family"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <div className="space-y-6">
        <ErrorNote message={error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hf('guardian1FirstName', 'First name')}
          {hf('guardian1LastName', 'Last name')}
          {hf('email', 'Email', 'email')}
          {hf('phone', 'Phone', 'tel')}
          {hf('guardian1Relationship', 'Relationship')}
          <Field label="Registered parishioners?">
            <Select value={h.registeredParishioner === null ? '' : String(h.registeredParishioner)} onChange={e => setH({ ...h, registeredParishioner: e.target.value === '' ? null : e.target.value === 'true' })}>
              <option value="">Not asked</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">{hf('street', 'Street address')}</div>
          {hf('city', 'City')}
          <div className="grid grid-cols-2 gap-3">{hf('state', 'State')}{hf('zip', 'ZIP')}</div>
          {hf('guardian2FirstName', 'Second guardian first name')}
          {hf('guardian2LastName', 'Second guardian last name')}
          {hf('guardian2Email', 'Second guardian email', 'email')}
          {hf('guardian2Phone', 'Second guardian phone', 'tel')}
          {hf('emergencyContactName', 'Emergency contact')}
          {hf('emergencyContactPhone', 'Emergency phone', 'tel')}
        </div>

        {kids.map((k, i) => (
          <div key={k.id} className="rounded-lg border border-[#E8E2D4] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-[#1E3A5F]">{k.firstName || 'Child'}</p>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={k.archived} onChange={e => setKid(i, { archived: e.target.checked })} className="rounded border-gray-300" />
                Archived (moved away, aged out)
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="First name"><TextInput value={k.firstName} onChange={e => setKid(i, { firstName: e.target.value })} /></Field>
              <Field label="Last name"><TextInput value={k.lastName} onChange={e => setKid(i, { lastName: e.target.value })} /></Field>
              <Field label="Date of birth"><TextInput type="date" value={k.dateOfBirth} onChange={e => setKid(i, { dateOfBirth: e.target.value })} /></Field>
              <Field label="Grade">
                <Select value={k.grade} onChange={e => setKid(i, { grade: e.target.value })}>
                  <option value="">—</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}
                </Select>
              </Field>
              <Field label="School"><TextInput value={k.school} onChange={e => setKid(i, { school: e.target.value })} /></Field>
              <Field label="Baptized?">
                <Select value={k.baptized === null ? '' : String(k.baptized)} onChange={e => setKid(i, { baptized: e.target.value === '' ? null : e.target.value === 'true' })}>
                  <option value="">Not given</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              {k.baptized && (
                <>
                  <Field label="Baptism date"><TextInput type="date" value={k.baptismDate} onChange={e => setKid(i, { baptismDate: e.target.value })} /></Field>
                  <Field label="Baptism parish"><TextInput value={k.baptismParish} onChange={e => setKid(i, { baptismParish: e.target.value })} /></Field>
                  <Field label="City"><TextInput value={k.baptismCity} onChange={e => setKid(i, { baptismCity: e.target.value })} /></Field>
                </>
              )}
              <Field label="First Communion date"><TextInput type="date" value={k.firstCommunionDate} onChange={e => setKid(i, { firstCommunionDate: e.target.value })} /></Field>
              <Field label="First Communion parish" className="sm:col-span-2"><TextInput value={k.firstCommunionParish} onChange={e => setKid(i, { firstCommunionParish: e.target.value })} /></Field>
              <Field label="Allergies" className="sm:col-span-3"><TextInput value={k.allergies} onChange={e => setKid(i, { allergies: e.target.value })} /></Field>
              <Field label="Medical notes" className="sm:col-span-3"><TextInput value={k.medicalNotes} onChange={e => setKid(i, { medicalNotes: e.target.value })} /></Field>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
