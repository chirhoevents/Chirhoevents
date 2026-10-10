'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2, Upload, ChevronLeft, ChevronRight, CreditCard, Building2, HandHeart, FileText } from 'lucide-react'
import { formatMoney, gradeLabel, GRADE_OPTIONS } from '@/lib/lux/format'
import type { PublicProgram } from '@/lib/lux/public-programs'

export interface PrefillHousehold {
  guardian1FirstName: string; guardian1LastName: string; guardian1Relationship: string; email: string; phone: string
  street: string; city: string; state: string; zip: string
  guardian2FirstName: string; guardian2LastName: string; guardian2Relationship: string; guardian2Email: string; guardian2Phone: string
  emergencyContactName: string; emergencyContactPhone: string; registeredParishioner: boolean | null
}

export interface PrefillChild {
  childId: string; firstName: string; lastName: string; dateOfBirth: string; gender: string; grade: string; school: string
  baptized: boolean | null; baptismDate: string; baptismParish: string; baptismCity: string; baptizedAtThisParish: boolean
  firstCommunionDate: string; firstCommunionParish: string; allergies: string; medicalNotes: string
}

interface ChildForm extends Omit<PrefillChild, 'childId'> {
  key: string
  childId: string | null
  programId: string
  answers: Record<string, string | string[]>
  sponsor: { name: string; email: string; phone: string; parish: string; relationship: string }
}

interface QuoteLine { key: string; childName: string; programName: string; base: number; siblingDiscount: number; capAdjustment: number; total: number }
interface Quote { lines: QuoteLine[]; subtotal: number; siblingDiscount: number; familyCapAdjustment: number; total: number }

interface UploadSlot { submissionId: string; childKey: string; childName: string; programName: string; requirementKey: string; label: string; description: string | null; required: boolean; status: string }

const emptyHousehold: PrefillHousehold = {
  guardian1FirstName: '', guardian1LastName: '', guardian1Relationship: '', email: '', phone: '', street: '', city: '', state: '', zip: '',
  guardian2FirstName: '', guardian2LastName: '', guardian2Relationship: '', guardian2Email: '', guardian2Phone: '',
  emergencyContactName: '', emergencyContactPhone: '', registeredParishioner: null,
}

const newKey = () => Math.random().toString(36).slice(2, 10)

function blankChild(lastName: string, programId = ''): ChildForm {
  return {
    key: newKey(), childId: null, firstName: '', lastName, dateOfBirth: '', gender: '', grade: '', school: '', baptized: null,
    baptismDate: '', baptismParish: '', baptismCity: '', baptizedAtThisParish: false, firstCommunionDate: '', firstCommunionParish: '',
    allergies: '', medicalNotes: '', programId, answers: {}, sponsor: { name: '', email: '', phone: '', parish: '', relationship: '' },
  }
}

const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A]'
const STEPS = ['Your family', 'Your children', 'Documents', 'Review & pay'] as const

function L({ label, required, children, hint, className }: { label: string; required?: boolean; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-sm font-medium text-gray-800 mb-1">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  )
}

export default function FamilyRegistrationWizard(props: {
  slug: string
  organizationName: string
  programs: PublicProgram[]
  preselectProgramSlug: string | null
  paymentsReady: boolean
  feeRulesSummary: string
  officeInstructions: string
  household: PrefillHousehold | null
  knownChildren: PrefillChild[]
}) {
  const preselected = props.programs.find(p => p.slug === props.preselectProgramSlug)?.id ?? (props.programs.length === 1 ? props.programs[0].id : '')
  const [step, setStep] = useState(0)
  const [household, setHousehold] = useState<PrefillHousehold>(props.household ?? emptyHousehold)
  const [showGuardian2, setShowGuardian2] = useState(!!props.household?.guardian2FirstName)
  const [children, setChildren] = useState<ChildForm[]>(() => (props.knownChildren.length ? [] : [blankChild('', preselected)]))
  const [files, setFiles] = useState<Record<string, File>>({})
  const [quote, setQuote] = useState<Quote | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'office'>('card')
  const [assistance, setAssistance] = useState(false)
  const [assistanceNote, setAssistanceNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [uploadReport, setUploadReport] = useState<Array<{ label: string; childName: string; ok: boolean; message?: string }>>([])

  const programById = useMemo(() => new Map(props.programs.map(p => [p.id, p])), [props.programs])
  const chosenPrograms = useMemo(() => [...new Set(children.map(c => c.programId))].map(id => programById.get(id)).filter(Boolean) as PublicProgram[], [children, programById])
  const canPayCard = props.paymentsReady && chosenPrograms.length > 0 && chosenPrograms.every(p => p.onlinePaymentEnabled)
  const canPayOffice = chosenPrograms.length > 0 && chosenPrograms.every(p => p.payAtOfficeEnabled)
  const assistanceOffered = chosenPrograms.some(p => p.feeAssistanceEnabled)

  useEffect(() => {
    if (!canPayCard && canPayOffice) setPaymentMethod('office')
    if (canPayCard && !canPayOffice) setPaymentMethod('card')
  }, [canPayCard, canPayOffice])

  const setH = (patch: Partial<PrefillHousehold>) => setHousehold(h => ({ ...h, ...patch }))
  const setChild = (key: string, patch: Partial<ChildForm>) => setChildren(cs => cs.map(c => (c.key === key ? { ...c, ...patch } : c)))

  const addKnownChild = (known: PrefillChild) => {
    setChildren(cs => [...cs, { ...blankChild(known.lastName, preselected), ...known, key: newKey(), childId: known.childId }])
  }

  // ----- Step validation -----
  const familyProblem = (): string | null => {
    if (!household.guardian1FirstName.trim() || !household.guardian1LastName.trim()) return 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(household.email.trim())) return 'Please enter a valid email address.'
    if (!household.phone.trim()) return 'Please enter a phone number.'
    return null
  }
  const childrenProblem = (): string | null => {
    if (children.length === 0) return 'Add at least one child.'
    for (const c of children) {
      const name = c.firstName.trim() || 'each child'
      if (!c.firstName.trim()) return 'Please enter each child’s first name.'
      if (!c.programId) return `Choose a program for ${name}.`
      const program = programById.get(c.programId)!
      if (!c.grade) return `Choose ${name}’s grade.`
      if (program.grades && !program.grades.includes(c.grade)) return `${program.name} is for ${program.grades.map(g => gradeLabel(g)).join(', ')}.`
      for (const q of program.questions) {
        const a = c.answers[q.id]
        if (q.required && (!a || (Array.isArray(a) && a.length === 0))) return `Please answer “${q.label}” for ${name}.`
      }
      if (program.collectSponsor && !c.sponsor.name.trim()) return `Please enter ${name}’s sponsor.`
    }
    return null
  }

  const loadQuote = async () => {
    setBusy('quote')
    try {
      const res = await fetch(`/api/lux/public/org/${props.slug}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ children: children.map(c => ({ key: c.key, childId: c.childId, firstName: c.firstName, lastName: c.lastName || household.guardian1LastName, programId: c.programId })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not calculate fees')
      setQuote(data.quote)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const next = async () => {
    setError(null)
    const problem = step === 0 ? familyProblem() : step === 1 ? childrenProblem() : null
    if (problem) { setError(problem); return }
    if (step === 1 && children.every(c => (programById.get(c.programId)?.requirements.length ?? 0) === 0)) {
      setStep(3)
      await loadQuote()
    } else {
      if (step === 2) await loadQuote()
      setStep(s => Math.min(3, s + 1))
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const back = () => {
    setError(null)
    setStep(s => (s === 3 && children.every(c => (programById.get(c.programId)?.requirements.length ?? 0) === 0) ? 1 : Math.max(0, s - 1)))
  }

  const submit = async () => {
    setError(null)
    setBusy('submit')
    try {
      const res = await fetch(`/api/lux/public/org/${props.slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household,
          children: children.map(c => ({ ...c, lastName: c.lastName || household.guardian1LastName, sponsor: programById.get(c.programId)?.collectSponsor ? c.sponsor : null })),
          paymentMethod,
          feeAssistance: { requested: assistance, note: assistanceNote },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Registration failed. Please try again.')

      // Upload the documents they picked, now that we know where they go
      const report: typeof uploadReport = []
      const slots: UploadSlot[] = data.uploads || []
      for (const slot of slots) {
        const file = files[`${slot.childKey}|${slot.requirementKey}`]
        if (!file || slot.status === 'approved') continue
        setBusy(`Uploading ${slot.label} for ${slot.childName}…`)
        const form = new FormData()
        form.set('submissionId', slot.submissionId)
        form.set('file', file)
        const up = await fetch('/api/lux/public/family/documents', { method: 'POST', body: form })
        const upData = await up.json().catch(() => ({}))
        report.push({ label: slot.label, childName: slot.childName, ok: up.ok, message: upData.error })
      }
      setUploadReport(report)

      if (data.checkoutUrl) {
        setBusy('Taking you to secure payment…')
        window.location.href = data.checkoutUrl
        return
      }
      const failed = report.filter(r => !r.ok).length
      window.location.href = `/lux/${props.slug}/registered/${data.orderId}?t=${data.payToken}${failed ? `&uploadIssues=${failed}` : ''}`
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  // ----- Render -----
  const unusedKnown = props.knownChildren.filter(k => !children.some(c => c.childId === k.childId))

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#1E3A5F] text-center" style={{ fontFamily: 'Georgia, serif' }}>Register for faith formation</h1>
      <p className="text-center text-gray-600 mt-1">{props.organizationName}</p>

      <ol className="flex items-center justify-center gap-2 sm:gap-4 my-6 text-xs sm:text-sm" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center gap-1.5 ${i === step ? 'text-[#1E3A5F] font-semibold' : i < step ? 'text-green-700' : 'text-gray-400'}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-[#1E3A5F] text-white' : i < step ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>

      <div className="bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[#1E3A5F]">Parent or guardian</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <L label="First name" required><input className={input} autoComplete="given-name" value={household.guardian1FirstName} onChange={e => setH({ guardian1FirstName: e.target.value })} /></L>
              <L label="Last name" required><input className={input} autoComplete="family-name" value={household.guardian1LastName} onChange={e => setH({ guardian1LastName: e.target.value })} /></L>
              <L label="Email" required hint="Confirmations and your family link go here." className="sm:col-span-2">
                <input className={input} type="email" autoComplete="email" value={household.email} onChange={e => setH({ email: e.target.value })} />
              </L>
              <L label="Phone" required><input className={input} type="tel" autoComplete="tel" value={household.phone} onChange={e => setH({ phone: e.target.value })} /></L>
              <L label="Relationship"><select className={input} value={household.guardian1Relationship} onChange={e => setH({ guardian1Relationship: e.target.value })}>
                <option value="">Choose…</option><option>Mother</option><option>Father</option><option>Guardian</option><option>Grandparent</option><option>Other</option>
              </select></L>
              <L label="Street address" className="sm:col-span-2"><input className={input} autoComplete="street-address" value={household.street} onChange={e => setH({ street: e.target.value })} /></L>
              <L label="City"><input className={input} autoComplete="address-level2" value={household.city} onChange={e => setH({ city: e.target.value })} /></L>
              <div className="grid grid-cols-2 gap-4">
                <L label="State"><input className={input} autoComplete="address-level1" value={household.state} onChange={e => setH({ state: e.target.value })} /></L>
                <L label="ZIP"><input className={input} autoComplete="postal-code" value={household.zip} onChange={e => setH({ zip: e.target.value })} /></L>
              </div>
            </div>

            {showGuardian2 ? (
              <div className="space-y-4 border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1E3A5F]">Second parent or guardian</h3>
                  <button type="button" className="text-sm text-gray-500" onClick={() => { setShowGuardian2(false); setH({ guardian2FirstName: '', guardian2LastName: '', guardian2Email: '', guardian2Phone: '', guardian2Relationship: '' }) }}>Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <L label="First name"><input className={input} value={household.guardian2FirstName} onChange={e => setH({ guardian2FirstName: e.target.value })} /></L>
                  <L label="Last name"><input className={input} value={household.guardian2LastName} onChange={e => setH({ guardian2LastName: e.target.value })} /></L>
                  <L label="Email"><input className={input} type="email" value={household.guardian2Email} onChange={e => setH({ guardian2Email: e.target.value })} /></L>
                  <L label="Phone"><input className={input} type="tel" value={household.guardian2Phone} onChange={e => setH({ guardian2Phone: e.target.value })} /></L>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowGuardian2(true)} className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">+ Add a second parent or guardian</button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-5">
              <L label="Emergency contact (not a parent)"><input className={input} value={household.emergencyContactName} onChange={e => setH({ emergencyContactName: e.target.value })} /></L>
              <L label="Emergency contact phone"><input className={input} type="tel" value={household.emergencyContactPhone} onChange={e => setH({ emergencyContactPhone: e.target.value })} /></L>
              <L label={`Are you registered at ${props.organizationName}?`} className="sm:col-span-2">
                <select className={input} value={household.registeredParishioner === null ? '' : household.registeredParishioner ? 'yes' : 'no'}
                  onChange={e => setH({ registeredParishioner: e.target.value === '' ? null : e.target.value === 'yes' })}>
                  <option value="">Not sure</option><option value="yes">Yes</option><option value="no">Not yet</option>
                </select>
              </L>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {unusedKnown.length > 0 && (
              <div className="rounded-xl bg-[#FAF8F3] p-4">
                <p className="text-sm font-medium text-[#1E3A5F] mb-2">Your children on file — tap to register them for this year:</p>
                <div className="flex flex-wrap gap-2">
                  {unusedKnown.map(k => (
                    <button key={k.childId} type="button" onClick={() => addKnownChild(k)} className="rounded-full border border-[#C8A24A] bg-white px-4 py-1.5 text-sm text-[#1E3A5F] hover:bg-[#FFFDF8]">
                      + {k.firstName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {children.map((c, index) => {
              const program = programById.get(c.programId)
              return (
                <div key={c.key} className="rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-[#1E3A5F]">{c.firstName.trim() || `Child ${index + 1}`}</h2>
                    {children.length > 1 && (
                      <button type="button" onClick={() => setChildren(cs => cs.filter(x => x.key !== c.key))} className="text-sm text-red-600 flex items-center gap-1">
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <L label="First name" required><input className={input} value={c.firstName} onChange={e => setChild(c.key, { firstName: e.target.value })} /></L>
                    <L label="Last name" hint={c.lastName ? undefined : `Leave blank for ${household.guardian1LastName || 'your last name'}`}>
                      <input className={input} value={c.lastName} onChange={e => setChild(c.key, { lastName: e.target.value })} placeholder={household.guardian1LastName} />
                    </L>
                    <L label="Date of birth"><input className={input} type="date" value={c.dateOfBirth} onChange={e => setChild(c.key, { dateOfBirth: e.target.value })} /></L>
                    <L label="Grade this year" required>
                      <select className={input} value={c.grade} onChange={e => setChild(c.key, { grade: e.target.value })}>
                        <option value="">Choose…</option>
                        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}
                      </select>
                    </L>
                    <L label="Program" required className="sm:col-span-2">
                      <select className={input} value={c.programId} onChange={e => setChild(c.key, { programId: e.target.value, answers: {} })}>
                        <option value="">Choose a program…</option>
                        {props.programs.map(p => {
                          const fits = !p.grades || !c.grade || p.grades.includes(c.grade)
                          const full = p.spotsLeft === 0
                          return (
                            <option key={p.id} value={p.id} disabled={!fits || full}>
                              {p.name} ({p.term}){p.grades ? ` · ${p.grades.length === 1 ? gradeLabel(p.grades[0]) : `${gradeLabel(p.grades[0])}–${gradeLabel(p.grades[p.grades.length - 1])}`}` : ''}{full ? ' · Full' : ''}{!fits ? ' · not for this grade' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </L>
                    <L label="Gender">
                      <select className={input} value={c.gender} onChange={e => setChild(c.key, { gender: e.target.value })}>
                        <option value="">Choose…</option><option value="female">Female</option><option value="male">Male</option>
                      </select>
                    </L>
                    <L label="School"><input className={input} value={c.school} onChange={e => setChild(c.key, { school: e.target.value })} /></L>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-sm font-medium text-gray-800">Has {c.firstName.trim() || 'your child'} been baptized?</p>
                    <div className="flex gap-4 text-sm">
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }, { v: null, l: 'Not sure' }].map(o => (
                        <label key={o.l} className="flex items-center gap-2">
                          <input type="radio" name={`bap-${c.key}`} checked={c.baptized === o.v} onChange={() => setChild(c.key, { baptized: o.v, ...(o.v !== true ? { baptizedAtThisParish: false } : {}) })} /> {o.l}
                        </label>
                      ))}
                    </div>
                    {c.baptized === true && (
                      <>
                        <label className="flex items-start gap-2 text-sm rounded-lg bg-[#FAF8F3] p-3">
                          <input type="checkbox" className="mt-0.5" checked={c.baptizedAtThisParish} onChange={e => setChild(c.key, { baptizedAtThisParish: e.target.checked })} />
                          <span>Baptized here at {props.organizationName}. <span className="text-gray-500">We’ll look up the certificate, so you don’t need to upload it.</span></span>
                        </label>
                        {!c.baptizedAtThisParish && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <L label="Baptism date"><input className={input} type="date" value={c.baptismDate} onChange={e => setChild(c.key, { baptismDate: e.target.value })} /></L>
                            <L label="Parish"><input className={input} value={c.baptismParish} onChange={e => setChild(c.key, { baptismParish: e.target.value })} /></L>
                            <L label="City"><input className={input} value={c.baptismCity} onChange={e => setChild(c.key, { baptismCity: e.target.value })} /></L>
                          </div>
                        )}
                      </>
                    )}
                    {program?.templateKey === 'confirmation' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <L label="First Communion date"><input className={input} type="date" value={c.firstCommunionDate} onChange={e => setChild(c.key, { firstCommunionDate: e.target.value })} /></L>
                        <L label="First Communion parish"><input className={input} value={c.firstCommunionParish} onChange={e => setChild(c.key, { firstCommunionParish: e.target.value })} /></L>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <L label="Allergies"><input className={input} value={c.allergies} onChange={e => setChild(c.key, { allergies: e.target.value })} placeholder="None" /></L>
                    <L label="Medical notes"><input className={input} value={c.medicalNotes} onChange={e => setChild(c.key, { medicalNotes: e.target.value })} /></L>
                  </div>

                  {program && program.questions.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                      {program.questions.map(q => (
                        <div key={q.id}>
                          <p className="text-sm font-medium text-gray-800 mb-1">{q.label}{q.required && <span className="text-red-600"> *</span>}</p>
                          {q.type === 'text' && <input className={input} value={(c.answers[q.id] as string) || ''} onChange={e => setChild(c.key, { answers: { ...c.answers, [q.id]: e.target.value } })} />}
                          {(q.type === 'yes_no' || q.type === 'multiple_choice') && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              {(q.type === 'yes_no' ? ['Yes', 'No'] : q.options).map(o => (
                                <label key={o} className="flex items-center gap-2">
                                  <input type="radio" name={`${c.key}-${q.id}`} checked={c.answers[q.id] === o} onChange={() => setChild(c.key, { answers: { ...c.answers, [q.id]: o } })} /> {o}
                                </label>
                              ))}
                            </div>
                          )}
                          {q.type === 'dropdown' && (
                            <select className={input} value={(c.answers[q.id] as string) || ''} onChange={e => setChild(c.key, { answers: { ...c.answers, [q.id]: e.target.value } })}>
                              <option value="">Choose…</option>
                              {q.options.map(o => <option key={o}>{o}</option>)}
                            </select>
                          )}
                          {q.type === 'multi_select' && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              {q.options.map(o => {
                                const current = (c.answers[q.id] as string[]) || []
                                return (
                                  <label key={o} className="flex items-center gap-2">
                                    <input type="checkbox" checked={current.includes(o)}
                                      onChange={() => setChild(c.key, { answers: { ...c.answers, [q.id]: current.includes(o) ? current.filter(x => x !== o) : [...current, o] } })} /> {o}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {program?.collectSponsor && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm font-medium text-gray-800 mb-2">Confirmation sponsor</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <L label="Sponsor’s name" required><input className={input} value={c.sponsor.name} onChange={e => setChild(c.key, { sponsor: { ...c.sponsor, name: e.target.value } })} /></L>
                        <L label="Relationship"><input className={input} value={c.sponsor.relationship} onChange={e => setChild(c.key, { sponsor: { ...c.sponsor, relationship: e.target.value } })} placeholder="Aunt, godfather…" /></L>
                        <L label="Sponsor’s email"><input className={input} type="email" value={c.sponsor.email} onChange={e => setChild(c.key, { sponsor: { ...c.sponsor, email: e.target.value } })} /></L>
                        <L label="Sponsor’s phone"><input className={input} type="tel" value={c.sponsor.phone} onChange={e => setChild(c.key, { sponsor: { ...c.sponsor, phone: e.target.value } })} /></L>
                        <L label="Sponsor’s parish" className="sm:col-span-2"><input className={input} value={c.sponsor.parish} onChange={e => setChild(c.key, { sponsor: { ...c.sponsor, parish: e.target.value } })} /></L>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <button type="button" onClick={() => setChildren(cs => [...cs, blankChild('', preselected)])}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 py-4 text-[#1E3A5F] hover:border-[#C8A24A] flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" /> Add another child
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1E3A5F]">Documents</h2>
              <p className="text-sm text-gray-600">Upload now if you have them handy (a phone photo is fine), or skip and upload later from your family page.</p>
            </div>
            {children.map(c => {
              const program = programById.get(c.programId)
              if (!program || program.requirements.length === 0) return null
              return (
                <div key={c.key} className="rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-[#1E3A5F]">{c.firstName} · {program.name}</p>
                  <div className="mt-3 space-y-3">
                    {program.requirements.map(r => {
                      const fileKey = `${c.key}|${r.key}`
                      const lookup = r.allowParishLookup && c.baptizedAtThisParish && r.key === 'baptismal_certificate'
                      const file = files[fileKey]
                      return (
                        <div key={r.key} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-lg bg-[#FAF8F3] p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 flex items-center gap-1"><FileText className="h-4 w-4 text-[#C8A24A]" /> {r.label}{!r.required && <span className="text-gray-400 font-normal"> (optional)</span>}</p>
                            {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                          </div>
                          {lookup ? (
                            <span className="text-sm text-green-700 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> The parish will look it up</span>
                          ) : (
                            <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-[#C8A24A] shrink-0">
                              <Upload className="h-4 w-4" />
                              <span className="max-w-[12rem] truncate">{file ? file.name : 'Choose file'}</span>
                              <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => {
                                const f = e.target.files?.[0]
                                if (!f) return
                                if (f.size > 10 * 1024 * 1024) { setError('That file is over 10 MB. Try a photo or a smaller scan.'); return }
                                setFiles(fs => ({ ...fs, [fileKey]: f }))
                              }} />
                            </label>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1E3A5F]">Review</h2>
            {!quote ? (
              <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Calculating fees…</div>
            ) : (
              <div className="rounded-xl bg-[#FAF8F3] p-4 text-sm">
                {quote.lines.map(l => (
                  <div key={l.key} className="flex justify-between py-1.5 border-b border-[#EDE6D6] last:border-0">
                    <span><strong>{l.childName}</strong> · {l.programName}{l.siblingDiscount > 0 && <span className="text-green-700"> (sibling discount −{formatMoney(l.siblingDiscount)})</span>}</span>
                    <span>{formatMoney(l.total)}</span>
                  </div>
                ))}
                {quote.familyCapAdjustment > 0 && (
                  <div className="flex justify-between py-1.5 text-green-700"><span>Family maximum applied</span><span>−{formatMoney(quote.familyCapAdjustment)}</span></div>
                )}
                <div className="flex justify-between pt-3 text-base font-semibold text-[#1E3A5F]"><span>Total</span><span>{formatMoney(quote.total)}</span></div>
                {props.feeRulesSummary !== 'No sibling discount or family maximum' && <p className="text-xs text-gray-500 mt-2">Parish fee policy: {props.feeRulesSummary}.</p>}
              </div>
            )}

            {quote && quote.total > 0 && (
              <div className="space-y-3">
                {assistanceOffered && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5" checked={assistance} onChange={e => setAssistance(e.target.checked)} />
                      <span><span className="font-medium flex items-center gap-1"><HandHeart className="h-4 w-4 text-[#C8A24A]" /> I’d like to ask about fee assistance</span>
                        <span className="text-gray-600">No child is turned away for financial reasons. Your children are registered now, and the parish will contact you privately.</span></span>
                    </label>
                    {assistance && (
                      <textarea className={`${input} mt-3`} rows={2} value={assistanceNote} onChange={e => setAssistanceNote(e.target.value)} placeholder="Anything you’d like the parish to know (optional)" />
                    )}
                  </div>
                )}
                {!assistance && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-800">How would you like to pay?</p>
                    {canPayCard && (
                      <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer ${paymentMethod === 'card' ? 'border-[#C8A24A] bg-[#FFFDF8]' : 'border-gray-200'}`}>
                        <input type="radio" className="mt-1" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                        <span><span className="font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pay now by card</span><span className="text-sm text-gray-500">Secure checkout. Receipt by email.</span></span>
                      </label>
                    )}
                    {canPayOffice && (
                      <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer ${paymentMethod === 'office' ? 'border-[#C8A24A] bg-[#FFFDF8]' : 'border-gray-200'}`}>
                        <input type="radio" className="mt-1" checked={paymentMethod === 'office'} onChange={() => setPaymentMethod('office')} />
                        <span><span className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> Pay at the parish office</span>
                          <span className="text-sm text-gray-500">{props.officeInstructions || 'Bring cash or a check to the office.'}</span></span>
                      </label>
                    )}
                    {!canPayCard && !canPayOffice && <p className="text-sm text-red-600">Please contact the parish office to finish registering.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
        {uploadReport.some(r => !r.ok) && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Some documents didn’t upload; you can add them from your family page.
          </div>
        )}

        <div className="flex items-center justify-between mt-7 pt-5 border-t border-gray-100">
          {step > 0 ? (
            <button type="button" onClick={back} disabled={!!busy} className="inline-flex items-center gap-1 text-[#1E3A5F] px-3 py-2 rounded-lg hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> Back</button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" onClick={next} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] px-6 py-3 text-white font-medium disabled:bg-gray-300">
              {busy === 'quote' && <Loader2 className="h-4 w-4 animate-spin" />} {step === 2 ? 'Review' : 'Continue'} <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!!busy || !quote || (quote.total > 0 && !assistance && !canPayCard && !canPayOffice)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C8A24A] hover:bg-[#B8923A] px-6 py-3 text-white font-semibold disabled:bg-gray-300">
              {busy && busy !== 'quote' ? <><Loader2 className="h-4 w-4 animate-spin" /> {busy === 'submit' ? 'Saving…' : busy}</>
                : quote && quote.total > 0 && !assistance && paymentMethod === 'card' && canPayCard ? `Continue to payment (${formatMoney(quote.total)})` : 'Submit registration'}
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">Your family’s information is only shared with {props.organizationName} staff.</p>
    </div>
  )
}
