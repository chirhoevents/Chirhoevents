'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, FileText, Users, CreditCard, Building2, HandHeart } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { toast } from '@/lib/toast'
import QuestionEditor, { type EditableQuestion } from '@/components/lux/QuestionEditor'
import { Button, Card, ErrorNote, Field, Select, TextArea, TextInput, Toggle, cx } from '@/components/lux/ui'
import { GRADE_OPTIONS, gradeLabel } from '@/lib/lux/format'
import type { ProgramQuestion, ProgramTemplate } from '@/lib/lux/program-templates'

export interface ProgramFormValue {
  id?: string
  status?: string
  templateKey: string
  name: string
  term: string
  description: string
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  capacity: number | null
  grades: string[] | null
  tuitionPerChild: number
  feeItems: Array<{ id: string; name: string; amount: number; siblingDiscount: boolean }>
  siblingDiscountApplies: boolean
  countsTowardFamilyCap: boolean
  onlinePaymentEnabled: boolean
  payAtOfficeEnabled: boolean
  feeAssistanceEnabled: boolean
  collectSponsor: boolean
  collectServiceHours: boolean
  serviceHoursRequired: number | null
  questions: ProgramQuestion[]
  confirmationMessage: string
  documentRetentionDays: number | null
  requirements: Array<{ id?: string; key: string; label: string; description: string; required: boolean; allowParishLookup: boolean }>
}

const key = () => Math.random().toString(36).slice(2, 10)

const toDateInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '')
// Registration opens at the start of the chosen day and closes at the end of it, in the staff member's time zone
const fromDateInput = (day: string, endOfDay: boolean) => (day ? new Date(`${day}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString() : null)

export function programValueFromTemplate(template: ProgramTemplate, term: string): ProgramFormValue {
  const d = template.defaults
  return {
    templateKey: template.key,
    name: d.name,
    term,
    description: d.description,
    registrationOpensAt: null,
    registrationClosesAt: null,
    capacity: null,
    grades: d.grades,
    tuitionPerChild: 0,
    feeItems: [],
    siblingDiscountApplies: true,
    countsTowardFamilyCap: true,
    onlinePaymentEnabled: true,
    payAtOfficeEnabled: true,
    feeAssistanceEnabled: true,
    collectSponsor: d.collectSponsor,
    collectServiceHours: d.collectServiceHours,
    serviceHoursRequired: d.serviceHoursRequired,
    questions: d.questions,
    confirmationMessage: d.confirmationMessage,
    documentRetentionDays: null,
    requirements: d.requirements.map(r => ({ ...r })),
  }
}

export default function ProgramForm({ initial, suggestedFees = [], feeRulesSummary }: {
  initial: ProgramFormValue
  suggestedFees?: string[]
  feeRulesSummary?: string
}) {
  const router = useRouter()
  const api = useLuxApi()
  const { info } = useLux()
  const isEdit = !!initial.id
  const isDraft = !initial.status || initial.status === 'draft'

  const [v, setV] = useState<ProgramFormValue>(initial)
  const [opensOn, setOpensOn] = useState(toDateInput(initial.registrationOpensAt))
  const [closesOn, setClosesOn] = useState(toDateInput(initial.registrationClosesAt))
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    initial.questions.map(q => ({ id: q.id, key: q.id || key(), questionText: q.label, questionType: q.type, options: q.options, required: q.required }))
  )
  const [saving, setSaving] = useState<null | 'draft' | 'open'>(null)
  const [error, setError] = useState<string | null>(null)
  const patch = (p: Partial<ProgramFormValue>) => setV(prev => ({ ...prev, ...p }))

  const toggleGrade = (grade: string) => {
    const current = v.grades ?? []
    const next = current.includes(grade) ? current.filter(g => g !== grade) : [...current, grade]
    patch({ grades: next.length ? GRADE_OPTIONS.filter(g => next.includes(g)) : null })
  }

  const save = async (open: boolean) => {
    setError(null)
    setSaving(open ? 'open' : 'draft')
    try {
      const body = {
        ...v,
        registrationOpensAt: fromDateInput(opensOn, false),
        registrationClosesAt: fromDateInput(closesOn, true),
        questions: questions.map(q => ({ id: q.id || q.key, label: q.questionText, type: q.questionType, options: q.options.map(o => o.trim()).filter(Boolean), required: q.required })),
      }
      let id = v.id
      if (isEdit) await api(`/api/lux/programs/${id}`, { method: 'PUT', json: body })
      else id = (await api<{ program: { id: string } }>('/api/lux/programs', { method: 'POST', json: body })).program.id

      if (open && isDraft) {
        try {
          await api(`/api/lux/programs/${id}/status`, { method: 'POST', json: { status: 'open' } })
          toast.success('Registration is open!')
        } catch (openError) {
          toast.error((openError as Error).message, { duration: 6000 })
        }
      } else {
        toast.success(isEdit ? 'Changes saved' : 'Draft saved')
      }
      router.push(`/dashboard/lux/programs/${id}`)
    } catch (e) {
      setError((e as Error).message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(null)
    }
  }

  const updateFee = (index: number, p: Partial<ProgramFormValue['feeItems'][number]>) =>
    patch({ feeItems: v.feeItems.map((f, i) => (i === index ? { ...f, ...p } : f)) })
  const updateReq = (index: number, p: Partial<ProgramFormValue['requirements'][number]>) =>
    patch({ requirements: v.requirements.map((r, i) => (i === index ? { ...r, ...p } : r)) })
  const unusedSuggestions = suggestedFees.filter(name => !v.feeItems.some(f => f.name.toLowerCase() === name.toLowerCase()))

  return (
    <div className="space-y-5 max-w-3xl">
      <ErrorNote message={error} />

      <Card title="The basics">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Program name" required className="sm:col-span-2">
              <TextInput value={v.name} onChange={e => patch({ name: e.target.value })} placeholder="First Communion Preparation" />
            </Field>
            <Field label="Year / term" required>
              <TextInput value={v.term} onChange={e => patch({ term: e.target.value })} placeholder="2026–2027" />
            </Field>
          </div>
          <Field label="Description for families" hint="Shown on your parish registration page.">
            <TextArea value={v.description} onChange={e => patch({ description: e.target.value })} rows={3} />
          </Field>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Grades <span className="font-normal text-gray-500">(leave all off for any grade)</span></p>
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map(g => {
                const on = v.grades?.includes(g)
                return (
                  <button key={g} type="button" onClick={() => toggleGrade(g)}
                    className={cx('px-3 py-1.5 rounded-full text-sm border transition-colors',
                      on ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-700 border-[#D9D2C2] hover:border-[#C8A24A]')}>
                    {g === 'PK' ? 'Pre-K' : g === 'K' ? 'K' : g === 'Adult' ? 'Adult' : g}
                  </button>
                )
              })}
            </div>
            {v.grades && <p className="text-xs text-gray-500 mt-2">For: {v.grades.map(gradeLabel).join(', ')}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Capacity" hint="Children. Blank = no limit.">
              <TextInput type="number" min="1" value={v.capacity ?? ''} onChange={e => patch({ capacity: e.target.value ? Number(e.target.value) : null })} placeholder="No limit" />
            </Field>
            <Field label="Registration opens" hint="Blank = when you open it">
              <TextInput type="date" value={opensOn} onChange={e => setOpensOn(e.target.value)} />
            </Field>
            <Field label="Registration closes" hint="Blank = until you close it">
              <TextInput type="date" value={closesOn} onChange={e => setClosesOn(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Fees" description="Per child. Use 0 for a free program.">
        <div className="space-y-4">
          <Field label="Tuition per child" className="sm:w-48">
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
              <TextInput type="number" min="0" step="0.01" className="pl-6" value={v.tuitionPerChild}
                onChange={e => patch({ tuitionPerChild: Number(e.target.value) || 0 })} />
            </div>
          </Field>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Extra fees per child</p>
            {v.feeItems.length === 0 && <p className="text-sm text-gray-500 mb-2">Books, retreat, sacrament fee… add any you charge.</p>}
            <div className="space-y-2">
              {v.feeItems.map((f, i) => (
                <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
                  <TextInput className="col-span-12 sm:col-span-5" value={f.name} onChange={e => updateFee(i, { name: e.target.value })} placeholder="Books" aria-label="Fee name" />
                  <div className="col-span-5 sm:col-span-3 relative">
                    <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                    <TextInput type="number" min="0" step="0.01" className="pl-6" value={f.amount}
                      onChange={e => updateFee(i, { amount: Number(e.target.value) || 0 })} aria-label="Amount" />
                  </div>
                  <label className="col-span-5 sm:col-span-3 flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={f.siblingDiscount} onChange={e => updateFee(i, { siblingDiscount: e.target.checked })} />
                    Sibling discount applies
                  </label>
                  <button type="button" onClick={() => patch({ feeItems: v.feeItems.filter((_, j) => j !== i) })}
                    className="col-span-2 sm:col-span-1 p-2 text-red-600 hover:bg-red-50 rounded justify-self-end" aria-label="Remove fee">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="secondary" onClick={() => patch({ feeItems: [...v.feeItems, { id: key(), name: '', amount: 0, siblingDiscount: false }] })}>
                <Plus className="h-4 w-4" /> Add a fee
              </Button>
              {unusedSuggestions.map(name => (
                <Button key={name} variant="ghost" onClick={() => patch({ feeItems: [...v.feeItems, { id: key(), name, amount: 0, siblingDiscount: false }] })}>
                  + {name}
                </Button>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-[#F0EBDF]">
            <p className="text-sm text-gray-600 mb-1">
              Your parish’s sibling discount and family maximum: <strong>{feeRulesSummary || 'none set'}</strong>.{' '}
              <Link href="/dashboard/lux/settings" className="underline text-[#9C8466]">Change</Link>
            </p>
            <Toggle checked={v.siblingDiscountApplies} onChange={c => patch({ siblingDiscountApplies: c })} label="Sibling discount applies to this program" />
            <Toggle checked={v.countsTowardFamilyCap} onChange={c => patch({ countsTowardFamilyCap: c })} label="Counts toward the family maximum" />
          </div>
        </div>
      </Card>

      <Card title="Payment">
        <div className="divide-y divide-[#F0EBDF]">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-[#9C8466] mt-2.5" />
            <div className="flex-1">
              <Toggle checked={v.onlinePaymentEnabled} onChange={c => patch({ onlinePaymentEnabled: c })} label="Pay online by card"
                description={info.paymentsReady ? 'Paid straight to your parish’s Stripe account.' : <>Needs Stripe connected. <Link className="underline" href="/dashboard/lux/settings?tab=integrations">Connect Stripe</Link></>} />
            </div>
          </div>
          <div className="flex items-start gap-3 pt-2">
            <Building2 className="h-5 w-5 text-[#9C8466] mt-2.5" />
            <div className="flex-1">
              <Toggle checked={v.payAtOfficeEnabled} onChange={c => patch({ payAtOfficeEnabled: c })} label="Pay at the parish office"
                description="Families register now and pay by cash or check. You mark it paid. Office instructions are in Lux settings." />
            </div>
          </div>
          <div className="flex items-start gap-3 pt-2">
            <HandHeart className="h-5 w-5 text-[#9C8466] mt-2.5" />
            <div className="flex-1">
              <Toggle checked={v.feeAssistanceEnabled} onChange={c => patch({ feeAssistanceEnabled: c })} label="Families can quietly ask for fee assistance"
                description="Their children are registered right away; you decide the amount privately." />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Sponsor and service" description="Usually for Confirmation.">
        <Toggle checked={v.collectSponsor} onChange={c => patch({ collectSponsor: c })} label="Ask for sponsor information" description="Name, email, phone, parish and relationship." />
        <Toggle checked={v.collectServiceHours} onChange={c => patch({ collectServiceHours: c })} label="Track service hours" />
        {v.collectServiceHours && (
          <Field label="Hours required" className="sm:w-40 mt-1">
            <TextInput type="number" min="0" value={v.serviceHoursRequired ?? ''} onChange={e => patch({ serviceHoursRequired: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        )}
      </Card>

      <Card title="Documents to collect" description="Families upload these when they register, or later from their family page.">
        <div className="space-y-3">
          {v.requirements.length === 0 && <p className="text-sm text-gray-500">No documents needed.</p>}
          {v.requirements.map((r, i) => (
            <div key={r.id || r.key || i} className="rounded-lg border border-[#E8E2D4] p-3 bg-[#FFFDF8]">
              <div className="flex gap-2">
                <FileText className="h-5 w-5 text-[#9C8466] mt-2 shrink-0" />
                <div className="flex-1 space-y-2">
                  <TextInput value={r.label} onChange={e => updateReq(i, { label: e.target.value })} placeholder="Baptismal certificate" aria-label="Document name" />
                  <TextInput value={r.description} onChange={e => updateReq(i, { description: e.target.value })} placeholder="Short explanation for families (optional)" aria-label="Description" />
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={r.required} onChange={e => updateReq(i, { required: e.target.checked })} /> Required</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={r.allowParishLookup} onChange={e => updateReq(i, { allowParishLookup: e.target.checked })} /> Offer “We’ll look it up” for children baptized here</label>
                  </div>
                </div>
                <button type="button" onClick={() => patch({ requirements: v.requirements.filter((_, j) => j !== i) })}
                  className="p-2 text-red-600 hover:bg-red-50 rounded self-start" aria-label="Remove document"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => patch({ requirements: [...v.requirements, { key: '', label: '', description: '', required: true, allowParishLookup: false }] })}>
            <Plus className="h-4 w-4" /> Add a document
          </Button>
        </div>
      </Card>

      <Card title="Questions for each child" description="Besides name, birth date, grade, baptism, allergies and medical notes, which are always asked.">
        <QuestionEditor questions={questions} onChange={setQuestions} />
      </Card>

      <Card title="After they register">
        <div className="space-y-4">
          <Field label="Message in the confirmation email" hint="Parent meetings, class schedule, what happens next.">
            <TextArea value={v.confirmationMessage} onChange={e => patch({ confirmationMessage: e.target.value })} rows={3} />
          </Field>
          <Field label="Keep uploaded documents" hint="They stay stored and viewable by your staff until then.">
            <Select value={v.documentRetentionDays ?? ''} onChange={e => patch({ documentRetentionDays: e.target.value ? Number(e.target.value) : null })} className="sm:w-80">
              <option value="">Until we delete them</option>
              <option value="365">1 year after upload</option>
              <option value="730">2 years after upload</option>
              <option value="1825">5 years after upload</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 pb-8">
        <Button variant="ghost" href={isEdit ? `/dashboard/lux/programs/${v.id}` : '/dashboard/lux/programs'}>Cancel</Button>
        {isDraft && <Button variant="secondary" onClick={() => save(false)} loading={saving === 'draft'} disabled={!!saving}>Save draft</Button>}
        <Button variant={isDraft ? 'gold' : 'primary'} onClick={() => save(isDraft)} loading={isDraft ? saving === 'open' : !!saving} disabled={!!saving}>
          {isDraft ? 'Save & open registration' : 'Save changes'}
        </Button>
      </div>
      <p className="text-xs text-gray-500 pb-8 -mt-6 text-right"><Users className="inline h-3 w-3" /> Families register from your parish page.</p>
    </div>
  )
}
