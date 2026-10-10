'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2, Loader2, CheckCircle2, Upload, ChevronLeft, ChevronRight, CreditCard, Building2, HandHeart, FileText, Baby, UserRound } from 'lucide-react'
import { formatMoney, gradeLabel, GRADE_OPTIONS } from '@/lib/lux/format'
import { dict, documentDescription, documentLabel, optionText, questionText, type LuxLang } from '@/lib/lux/i18n'
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
  firstCommunionDate: string; firstCommunionParish: string; allergies: string; medicalNotes: string; isAdult: boolean
}

interface PersonForm extends Omit<PrefillChild, 'childId'> {
  key: string
  childId: string | null
  programId: string
  sessionId: string
  answers: Record<string, string | string[]>
  sponsor: { name: string; email: string; phone: string; parish: string; relationship: string }
}

interface QuoteLine {
  key: string; childName: string; programName: string; base: number; siblingDiscount: number; capAdjustment: number; total: number
  perFamily?: boolean; coveredByFamilyFee?: boolean; familyFeeAlreadyPaid?: boolean
}
interface Quote { lines: QuoteLine[]; subtotal: number; siblingDiscount: number; familyCapAdjustment: number; total: number }

interface UploadSlot { submissionId: string; childKey: string; childName: string; programName: string; requirementKey: string; label: string; description: string | null; required: boolean; status: string }

const emptyHousehold: PrefillHousehold = {
  guardian1FirstName: '', guardian1LastName: '', guardian1Relationship: '', email: '', phone: '', street: '', city: '', state: '', zip: '',
  guardian2FirstName: '', guardian2LastName: '', guardian2Relationship: '', guardian2Email: '', guardian2Phone: '',
  emergencyContactName: '', emergencyContactPhone: '', registeredParishioner: null,
}

const newKey = () => Math.random().toString(36).slice(2, 10)

function blankPerson(isAdult: boolean, programId = ''): PersonForm {
  return {
    key: newKey(), childId: null, firstName: '', lastName: '', dateOfBirth: '', gender: '', grade: '', school: '', baptized: null,
    baptismDate: '', baptismParish: '', baptismCity: '', baptizedAtThisParish: false, firstCommunionDate: '', firstCommunionParish: '',
    allergies: '', medicalNotes: '', isAdult, programId, sessionId: '', answers: {}, sponsor: { name: '', email: '', phone: '', parish: '', relationship: '' },
  }
}

const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A]'

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
  lang: LuxLang
  accentColor?: string | null
}) {
  const t = dict(props.lang)
  const w = t.wizard
  const accent = props.accentColor || '#C8A24A'
  const programById = useMemo(() => new Map(props.programs.map(p => [p.id, p])), [props.programs])
  const adultPrograms = props.programs.filter(p => p.audience === 'adults')
  const childPrograms = props.programs.filter(p => p.audience !== 'adults')
  const preselectedProgram = props.programs.find(p => p.slug === props.preselectProgramSlug)
  const defaultFor = (isAdult: boolean) => {
    const list = isAdult ? adultPrograms : childPrograms
    if (preselectedProgram && (preselectedProgram.audience === 'adults') === isAdult) return preselectedProgram.id
    return list.length === 1 ? list[0].id : ''
  }
  const startAdult = preselectedProgram ? preselectedProgram.audience === 'adults' : childPrograms.length === 0

  const [step, setStep] = useState(0)
  const [household, setHousehold] = useState<PrefillHousehold>(props.household ?? emptyHousehold)
  const [showGuardian2, setShowGuardian2] = useState(!!props.household?.guardian2FirstName)
  const [people, setPeople] = useState<PersonForm[]>(() => (props.knownChildren.length ? [] : [blankPerson(startAdult, defaultFor(startAdult))]))
  const [files, setFiles] = useState<Record<string, File>>({})
  const [quote, setQuote] = useState<Quote | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'office'>('card')
  const [assistance, setAssistance] = useState(false)
  const [assistanceNote, setAssistanceNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [uploadReport, setUploadReport] = useState<Array<{ label: string; childName: string; ok: boolean }>>([])

  const chosenPrograms = useMemo(() => [...new Set(people.map(c => c.programId))].map(id => programById.get(id)).filter(Boolean) as PublicProgram[], [people, programById])
  const canPayCard = props.paymentsReady && chosenPrograms.length > 0 && chosenPrograms.every(p => p.onlinePaymentEnabled)
  const canPayOffice = chosenPrograms.length > 0 && chosenPrograms.every(p => p.payAtOfficeEnabled)
  const assistanceOffered = chosenPrograms.some(p => p.feeAssistanceEnabled)
  const anyDocuments = people.some(c => (programById.get(c.programId)?.requirements.length ?? 0) > 0)
  const registeringChildren = childPrograms.length > 0

  useEffect(() => {
    if (!canPayCard && canPayOffice) setPaymentMethod('office')
    if (canPayCard && !canPayOffice) setPaymentMethod('card')
  }, [canPayCard, canPayOffice])

  const setH = (patch: Partial<PrefillHousehold>) => setHousehold(h => ({ ...h, ...patch }))
  const setPerson = (key: string, patch: Partial<PersonForm>) => setPeople(cs => cs.map(c => (c.key === key ? { ...c, ...patch } : c)))
  const addKnown = (known: PrefillChild) => {
    setPeople(cs => [...cs, { ...blankPerson(known.isAdult, defaultFor(known.isAdult)), ...known, key: newKey(), childId: known.childId }])
  }
  const displayName = (c: PersonForm) =>
    c.firstName.trim() || (c.isAdult ? w.adultN(people.filter(p => p.isAdult).indexOf(c) + 1) : w.childN(people.filter(p => !p.isAdult).indexOf(c) + 1))
  const grades = (list: string[]) => list.map(g => gradeLabel(g, props.lang)).join(', ')

  // ----- Step validation -----
  const aboutProblem = (): string | null => {
    if (!household.guardian1FirstName.trim() || !household.guardian1LastName.trim()) return w.errors.name
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(household.email.trim())) return w.errors.email
    if (!household.phone.trim()) return w.errors.phone
    return null
  }
  const peopleProblem = (): string | null => {
    if (people.length === 0) return w.errors.none
    for (const c of people) {
      const name = c.firstName.trim()
      if (!name) return w.errors.firstName
      if (!c.programId) return w.errors.program(name)
      const program = programById.get(c.programId)!
      // Grade matters only for programs sorted by grade (not infant baptism, adults...)
      if (!c.isAdult && program.grades) {
        if (!c.grade) return w.errors.grade(name)
        if (!program.grades.includes(c.grade)) return w.errors.gradeFit(program.name, grades(program.grades))
      }
      if (program.sessions.length > 0) {
        const session = program.sessions.find(sess => sess.id === c.sessionId)
        if (!session) return w.errors.classTime(name)
        if (!c.isAdult && session.grades) {
          if (!c.grade) return w.errors.grade(name)
          if (!session.grades.includes(c.grade)) return w.errors.gradeFit(session.name, grades(session.grades))
        }
      }
      for (const q of program.questions) {
        const a = c.answers[q.id]
        if (q.required && (!a || (Array.isArray(a) && a.length === 0))) return w.errors.answer(questionText(props.lang, q.id, q.label), name)
      }
      if (program.collectSponsor && !c.sponsor.name.trim()) return w.errors.sponsor(name)
    }
    return null
  }

  const loadQuote = async () => {
    setBusy('quote')
    try {
      const res = await fetch(`/api/lux/public/org/${props.slug}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ children: people.map(c => ({ key: c.key, childId: c.childId, firstName: c.firstName, lastName: c.lastName || household.guardian1LastName, programId: c.programId })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || w.errors.quote)
      setQuote(data.quote)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const next = async () => {
    setError(null)
    const problem = step === 0 ? aboutProblem() : step === 1 ? peopleProblem() : null
    if (problem) { setError(problem); return }
    if (step === 1 && !anyDocuments) {
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
    setStep(s => (s === 3 && !anyDocuments ? 1 : Math.max(0, s - 1)))
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
          children: people.map(c => ({
            ...c,
            lastName: c.lastName || household.guardian1LastName,
            sessionId: c.sessionId || null,
            sponsor: programById.get(c.programId)?.collectSponsor ? c.sponsor : null,
          })),
          paymentMethod,
          feeAssistance: { requested: assistance, note: assistanceNote },
          language: props.lang,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || w.errors.failed)

      // Upload the documents they picked, now that we know where they go
      const report: typeof uploadReport = []
      const slots: UploadSlot[] = data.uploads || []
      for (const slot of slots) {
        const file = files[`${slot.childKey}|${slot.requirementKey}`]
        if (!file || slot.status === 'approved') continue
        setBusy(w.uploading(documentLabel(props.lang, slot.label), slot.childName))
        const form = new FormData()
        form.set('submissionId', slot.submissionId)
        form.set('file', file)
        const up = await fetch('/api/lux/public/family/documents', { method: 'POST', body: form })
        report.push({ label: slot.label, childName: slot.childName, ok: up.ok })
      }
      setUploadReport(report)

      if (data.checkoutUrl) {
        setBusy(w.toPayment)
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
  const unusedKnown = props.knownChildren.filter(k => !people.some(c => c.childId === k.childId))

  const programOption = (p: PublicProgram, c: PersonForm) => {
    const fits = c.isAdult || !p.grades || !c.grade || p.grades.includes(c.grade)
    const full = p.spotsLeft === 0
    const range = p.grades ? ` · ${p.grades.length === 1 ? gradeLabel(p.grades[0], props.lang) : `${gradeLabel(p.grades[0], props.lang)}–${gradeLabel(p.grades[p.grades.length - 1], props.lang)}`}` : ''
    const language = p.language && t.parish.taughtIn[p.language] ? ` · ${t.parish.taughtIn[p.language]}` : ''
    return (
      <option key={p.id} value={p.id} disabled={!fits || full}>
        {p.name} ({p.term}){c.isAdult ? '' : range}{language}{full ? ` · ${t.parish.full}` : ''}{!fits ? ` · ${w.notForGrade}` : ''}
      </option>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] text-center">{w.title}</h1>
      <p className="text-center text-gray-600 mt-1">{props.organizationName}</p>

      <ol className="flex items-center justify-center gap-2 sm:gap-4 my-6 text-xs sm:text-sm" aria-label="Steps">
        {w.steps.map((label, i) => (i === 2 && !anyDocuments ? null : (
          <li key={label} className={`flex items-center gap-1.5 ${i === step ? 'text-[#1E3A5F] font-semibold' : i < step ? 'text-green-700' : 'text-gray-400'}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-[#1E3A5F] text-white' : i < step ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              {i < step ? '✓' : i + 1 - (i === 3 && !anyDocuments ? 1 : 0)}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        )))}
      </ol>

      <div className="bg-white rounded-2xl border border-[#E8E2D4] shadow-sm p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#1E3A5F]">{w.aboutHeading}</h2>
              {registeringChildren && <p className="text-sm text-gray-600">{w.aboutHint}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <L label={t.common.firstName} required><input className={input} autoComplete="given-name" value={household.guardian1FirstName} onChange={e => setH({ guardian1FirstName: e.target.value })} /></L>
              <L label={t.common.lastName} required><input className={input} autoComplete="family-name" value={household.guardian1LastName} onChange={e => setH({ guardian1LastName: e.target.value })} /></L>
              <L label={t.common.email} required hint={w.emailHint} className="sm:col-span-2">
                <input className={input} type="email" autoComplete="email" value={household.email} onChange={e => setH({ email: e.target.value })} />
              </L>
              <L label={t.common.phone} required><input className={input} type="tel" autoComplete="tel" value={household.phone} onChange={e => setH({ phone: e.target.value })} /></L>
              {registeringChildren ? (
                <L label={w.relationship}><select className={input} value={household.guardian1Relationship} onChange={e => setH({ guardian1Relationship: e.target.value })}>
                  <option value="">{t.common.choose}</option>
                  {Object.entries(w.relationships).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></L>
              ) : <span className="hidden sm:block" />}
              <L label={t.common.street} className="sm:col-span-2"><input className={input} autoComplete="street-address" value={household.street} onChange={e => setH({ street: e.target.value })} /></L>
              <L label={t.common.city}><input className={input} autoComplete="address-level2" value={household.city} onChange={e => setH({ city: e.target.value })} /></L>
              <div className="grid grid-cols-2 gap-4">
                <L label={t.common.state}><input className={input} autoComplete="address-level1" value={household.state} onChange={e => setH({ state: e.target.value })} /></L>
                <L label={t.common.zip}><input className={input} autoComplete="postal-code" value={household.zip} onChange={e => setH({ zip: e.target.value })} /></L>
              </div>
            </div>

            {registeringChildren && (showGuardian2 ? (
              <div className="space-y-4 border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1E3A5F]">{w.secondAdult}</h3>
                  <button type="button" className="text-sm text-gray-500" onClick={() => { setShowGuardian2(false); setH({ guardian2FirstName: '', guardian2LastName: '', guardian2Email: '', guardian2Phone: '', guardian2Relationship: '' }) }}>{w.remove}</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <L label={t.common.firstName}><input className={input} value={household.guardian2FirstName} onChange={e => setH({ guardian2FirstName: e.target.value })} /></L>
                  <L label={t.common.lastName}><input className={input} value={household.guardian2LastName} onChange={e => setH({ guardian2LastName: e.target.value })} /></L>
                  <L label={t.common.email}><input className={input} type="email" value={household.guardian2Email} onChange={e => setH({ guardian2Email: e.target.value })} /></L>
                  <L label={t.common.phone}><input className={input} type="tel" value={household.guardian2Phone} onChange={e => setH({ guardian2Phone: e.target.value })} /></L>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowGuardian2(true)} className="text-sm text-[#9C8466] hover:text-[#1E3A5F]">{w.addSecondAdult}</button>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-5">
              <L label={w.emergencyName}><input className={input} value={household.emergencyContactName} onChange={e => setH({ emergencyContactName: e.target.value })} /></L>
              <L label={w.emergencyPhone}><input className={input} type="tel" value={household.emergencyContactPhone} onChange={e => setH({ emergencyContactPhone: e.target.value })} /></L>
              <L label={w.parishioner(props.organizationName)} className="sm:col-span-2">
                <select className={input} value={household.registeredParishioner === null ? '' : household.registeredParishioner ? 'yes' : 'no'}
                  onChange={e => setH({ registeredParishioner: e.target.value === '' ? null : e.target.value === 'yes' })}>
                  <option value="">{t.common.notSure}</option><option value="yes">{t.common.yes}</option><option value="no">{w.notYet}</option>
                </select>
              </L>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {unusedKnown.length > 0 && (
              <div className="rounded-xl bg-[#FAF8F3] p-4">
                <p className="text-sm font-medium text-[#1E3A5F] mb-2">{w.onFile}</p>
                <div className="flex flex-wrap gap-2">
                  {unusedKnown.map(k => (
                    <button key={k.childId} type="button" onClick={() => addKnown(k)} className="rounded-full border bg-white px-4 py-1.5 text-sm text-[#1E3A5F] hover:bg-[#FFFDF8]" style={{ borderColor: accent }}>
                      + {k.firstName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {people.map(c => {
              const program = programById.get(c.programId)
              const choices = c.isAdult ? adultPrograms : childPrograms
              const isConfirmation = program?.templateKey === 'confirmation'
              const name = displayName(c)
              const sessions = program?.sessions ?? []
              const gradeRequired = !!program?.grades || sessions.some(sess => !!sess.grades)
              return (
                <div key={c.key} className="rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
                      {c.isAdult ? <UserRound className="h-5 w-5" style={{ color: accent }} /> : <Baby className="h-5 w-5" style={{ color: accent }} />} {name}
                    </h2>
                    <div className="flex items-center gap-3">
                      {c.isAdult && !c.firstName && (
                        <button type="button" className="text-sm text-[#9C8466] hover:text-[#1E3A5F]"
                          onClick={() => setPerson(c.key, { firstName: household.guardian1FirstName, lastName: household.guardian1LastName })}>
                          {w.thisIsMe}
                        </button>
                      )}
                      {people.length > 1 && (
                        <button type="button" onClick={() => setPeople(cs => cs.filter(x => x.key !== c.key))} className="text-sm text-red-600 flex items-center gap-1">
                          <Trash2 className="h-4 w-4" /> {w.remove}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <L label={t.common.firstName} required><input className={input} value={c.firstName} onChange={e => setPerson(c.key, { firstName: e.target.value })} /></L>
                    <L label={t.common.lastName} hint={c.lastName ? undefined : w.lastNameHint(household.guardian1LastName)}>
                      <input className={input} value={c.lastName} onChange={e => setPerson(c.key, { lastName: e.target.value })} placeholder={household.guardian1LastName} />
                    </L>
                    <L label={w.dob}><input className={input} type="date" value={c.dateOfBirth} onChange={e => setPerson(c.key, { dateOfBirth: e.target.value })} /></L>
                    {!c.isAdult && (
                      <L label={w.grade} required={gradeRequired}>
                        <select className={input} value={c.grade} onChange={e => setPerson(c.key, { grade: e.target.value, sessionId: '' })}>
                          <option value="">{t.common.choose}</option>
                          {GRADE_OPTIONS.filter(g => g !== 'Adult').map(g => <option key={g} value={g}>{gradeLabel(g, props.lang)}</option>)}
                        </select>
                      </L>
                    )}
                    <L label={w.program} required className="sm:col-span-2">
                      <select className={input} value={c.programId} onChange={e => setPerson(c.key, { programId: e.target.value, sessionId: '', answers: {} })}>
                        <option value="">{w.chooseProgram}</option>
                        {choices.map(p => programOption(p, c))}
                      </select>
                      {program?.perFamily && Number(program.tuitionPerChild) > 0 && (
                        <span className="block text-xs text-gray-500 mt-1">{w.familyFeeNote(formatMoney(program.tuitionPerChild))}</span>
                      )}
                    </L>
                    {sessions.length > 0 && (
                      <L label={w.classTime} required className="sm:col-span-2">
                        <select className={input} value={c.sessionId} onChange={e => setPerson(c.key, { sessionId: e.target.value })}>
                          <option value="">{w.chooseClassTime}</option>
                          {sessions.map(sess => {
                            const fits = c.isAdult || !sess.grades || !c.grade || sess.grades.includes(c.grade)
                            const full = sess.spotsLeft === 0
                            return (
                              <option key={sess.id} value={sess.id} disabled={!fits || full}>
                                {sess.name}{sess.schedule ? ` · ${sess.schedule}` : ''}{full ? ` · ${t.parish.full}` : ''}{!fits ? ` · ${w.notForGrade}` : ''}
                              </option>
                            )
                          })}
                        </select>
                      </L>
                    )}
                    {!c.isAdult && (
                      <>
                        <L label={w.gender}>
                          <select className={input} value={c.gender} onChange={e => setPerson(c.key, { gender: e.target.value })}>
                            <option value="">{t.common.choose}</option><option value="female">{w.female}</option><option value="male">{w.male}</option>
                          </select>
                        </L>
                        <L label={t.common.school}><input className={input} value={c.school} onChange={e => setPerson(c.key, { school: e.target.value })} /></L>
                      </>
                    )}
                  </div>

                  {/* Baptism Preparation is for the unbaptized; OCIA asks its own, more detailed question */}
                  {program?.templateKey !== 'baptism_prep' && !program?.questions.some(q => q.id === 'baptism_background') && (
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <p className="text-sm font-medium text-gray-800">
                        {c.isAdult && c.firstName && c.firstName === household.guardian1FirstName ? w.baptizedSelf : w.baptized(c.firstName.trim() || (c.isAdult ? name : w.yourChild))}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {[{ v: true, l: t.common.yes }, { v: false, l: t.common.no }, { v: null, l: t.common.notSure }].map(o => (
                          <label key={String(o.v)} className="flex items-center gap-2">
                            <input type="radio" name={`bap-${c.key}`} checked={c.baptized === o.v} onChange={() => setPerson(c.key, { baptized: o.v, ...(o.v !== true ? { baptizedAtThisParish: false } : {}) })} /> {o.l}
                          </label>
                        ))}
                      </div>
                      {c.baptized === true && (
                        <>
                          <label className="flex items-start gap-2 text-sm rounded-lg bg-[#FAF8F3] p-3">
                            <input type="checkbox" className="mt-0.5" checked={c.baptizedAtThisParish} onChange={e => setPerson(c.key, { baptizedAtThisParish: e.target.checked })} />
                            <span>{w.baptizedHere(props.organizationName)} <span className="text-gray-500">{w.baptizedHereHint}</span></span>
                          </label>
                          {!c.baptizedAtThisParish && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <L label={w.baptismDate}><input className={input} type="date" value={c.baptismDate} onChange={e => setPerson(c.key, { baptismDate: e.target.value })} /></L>
                              <L label={w.baptismParish}><input className={input} value={c.baptismParish} onChange={e => setPerson(c.key, { baptismParish: e.target.value })} /></L>
                              <L label={t.common.city}><input className={input} value={c.baptismCity} onChange={e => setPerson(c.key, { baptismCity: e.target.value })} /></L>
                            </div>
                          )}
                        </>
                      )}
                      {isConfirmation && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <L label={w.communionDate}><input className={input} type="date" value={c.firstCommunionDate} onChange={e => setPerson(c.key, { firstCommunionDate: e.target.value })} /></L>
                          <L label={w.communionParish}><input className={input} value={c.firstCommunionParish} onChange={e => setPerson(c.key, { firstCommunionParish: e.target.value })} /></L>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <L label={t.common.allergies}><input className={input} value={c.allergies} onChange={e => setPerson(c.key, { allergies: e.target.value })} placeholder={t.common.none} /></L>
                    <L label={t.common.medicalNotes}><input className={input} value={c.medicalNotes} onChange={e => setPerson(c.key, { medicalNotes: e.target.value })} /></L>
                  </div>

                  {program && program.questions.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                      {program.questions.map(q => (
                        <div key={q.id}>
                          <p className="text-sm font-medium text-gray-800 mb-1">{questionText(props.lang, q.id, q.label)}{q.required && <span className="text-red-600"> *</span>}</p>
                          {q.type === 'text' && <input className={input} value={(c.answers[q.id] as string) || ''} onChange={e => setPerson(c.key, { answers: { ...c.answers, [q.id]: e.target.value } })} />}
                          {(q.type === 'yes_no' || q.type === 'multiple_choice') && (
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                              {(q.type === 'yes_no' ? ['Yes', 'No'] : q.options).map(o => (
                                <label key={o} className="flex items-center gap-2">
                                  <input type="radio" name={`${c.key}-${q.id}`} checked={c.answers[q.id] === o} onChange={() => setPerson(c.key, { answers: { ...c.answers, [q.id]: o } })} /> {optionText(props.lang, q.id, o)}
                                </label>
                              ))}
                            </div>
                          )}
                          {q.type === 'dropdown' && (
                            <select className={input} value={(c.answers[q.id] as string) || ''} onChange={e => setPerson(c.key, { answers: { ...c.answers, [q.id]: e.target.value } })}>
                              <option value="">{t.common.choose}</option>
                              {q.options.map(o => <option key={o} value={o}>{optionText(props.lang, q.id, o)}</option>)}
                            </select>
                          )}
                          {q.type === 'multi_select' && (
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                              {q.options.map(o => {
                                const current = (c.answers[q.id] as string[]) || []
                                return (
                                  <label key={o} className="flex items-center gap-2">
                                    <input type="checkbox" checked={current.includes(o)}
                                      onChange={() => setPerson(c.key, { answers: { ...c.answers, [q.id]: current.includes(o) ? current.filter(x => x !== o) : [...current, o] } })} /> {optionText(props.lang, q.id, o)}
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
                      <p className="text-sm font-medium text-gray-800 mb-2">{w.sponsor}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <L label={w.sponsorName} required><input className={input} value={c.sponsor.name} onChange={e => setPerson(c.key, { sponsor: { ...c.sponsor, name: e.target.value } })} /></L>
                        <L label={w.sponsorRelationship}><input className={input} value={c.sponsor.relationship} onChange={e => setPerson(c.key, { sponsor: { ...c.sponsor, relationship: e.target.value } })} placeholder={w.sponsorRelationshipPlaceholder} /></L>
                        <L label={w.sponsorEmail}><input className={input} type="email" value={c.sponsor.email} onChange={e => setPerson(c.key, { sponsor: { ...c.sponsor, email: e.target.value } })} /></L>
                        <L label={w.sponsorPhone}><input className={input} type="tel" value={c.sponsor.phone} onChange={e => setPerson(c.key, { sponsor: { ...c.sponsor, phone: e.target.value } })} /></L>
                        <L label={w.sponsorParish} className="sm:col-span-2"><input className={input} value={c.sponsor.parish} onChange={e => setPerson(c.key, { sponsor: { ...c.sponsor, parish: e.target.value } })} /></L>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {childPrograms.length > 0 && (
                <button type="button" onClick={() => setPeople(cs => [...cs, blankPerson(false, defaultFor(false))])}
                  className="rounded-xl border-2 border-dashed border-gray-300 py-4 text-[#1E3A5F] hover:border-[#C8A24A] flex items-center justify-center gap-2">
                  <Baby className="h-5 w-5" /> {w.addChild}
                </button>
              )}
              {adultPrograms.length > 0 && (
                <button type="button" onClick={() => setPeople(cs => [...cs, blankPerson(true, defaultFor(true))])}
                  className="rounded-xl border-2 border-dashed border-gray-300 py-4 text-[#1E3A5F] hover:border-[#C8A24A] flex items-center justify-center gap-2">
                  <UserRound className="h-5 w-5" /> {w.addAdult}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1E3A5F]">{w.docsHeading}</h2>
              <p className="text-sm text-gray-600">{w.docsHint}</p>
            </div>
            {people.map(c => {
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
                      const description = documentDescription(props.lang, r.description)
                      return (
                        <div key={r.key} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-lg bg-[#FAF8F3] p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 flex items-center gap-1"><FileText className="h-4 w-4 text-[#C8A24A]" /> {documentLabel(props.lang, r.label)}{!r.required && <span className="text-gray-400 font-normal"> {t.common.optional}</span>}</p>
                            {description && <p className="text-xs text-gray-500">{description}</p>}
                          </div>
                          {lookup ? (
                            <span className="text-sm text-green-700 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {w.willLookUp}</span>
                          ) : (
                            <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-[#C8A24A] shrink-0">
                              <Upload className="h-4 w-4" />
                              <span className="max-w-[12rem] truncate">{file ? file.name : w.chooseFile}</span>
                              <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => {
                                const f = e.target.files?.[0]
                                if (!f) return
                                if (f.size > 10 * 1024 * 1024) { setError(w.fileTooBig); return }
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
            <h2 className="text-lg font-semibold text-[#1E3A5F]">{w.reviewHeading}</h2>
            {!quote ? (
              <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {w.calculating}</div>
            ) : (
              <div className="rounded-xl bg-[#FAF8F3] p-4 text-sm">
                {quote.lines.map(l => (
                  <div key={l.key} className="flex justify-between gap-3 py-1.5 border-b border-[#EDE6D6] last:border-0">
                    <span>
                      <strong>{l.childName}</strong> · {l.programName}
                      {l.siblingDiscount > 0 && <span className="text-green-700"> ({w.siblingDiscount(formatMoney(l.siblingDiscount))})</span>}
                      {l.perFamily && !l.coveredByFamilyFee && !l.familyFeeAlreadyPaid && <span className="text-gray-500"> ({w.familyFee})</span>}
                    </span>
                    <span className="text-right shrink-0">
                      {l.familyFeeAlreadyPaid ? <span className="text-gray-500">{w.familyFeePaid}</span>
                        : l.coveredByFamilyFee ? <span className="text-gray-500">{w.coveredByFamilyFee}</span>
                        : formatMoney(l.total)}
                    </span>
                  </div>
                ))}
                {quote.familyCapAdjustment > 0 && (
                  <div className="flex justify-between py-1.5 text-green-700"><span>{w.familyMax}</span><span>−{formatMoney(quote.familyCapAdjustment)}</span></div>
                )}
                <div className="flex justify-between pt-3 text-base font-semibold text-[#1E3A5F]"><span>{t.common.total}</span><span>{formatMoney(quote.total)}</span></div>
                {props.feeRulesSummary && <p className="text-xs text-gray-500 mt-2">{w.feePolicy(props.feeRulesSummary)}</p>}
              </div>
            )}

            {quote && quote.total > 0 && (
              <div className="space-y-3">
                {assistanceOffered && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5" checked={assistance} onChange={e => setAssistance(e.target.checked)} />
                      <span><span className="font-medium flex items-center gap-1"><HandHeart className="h-4 w-4 text-[#C8A24A]" /> {w.assistanceTitle}</span>
                        <span className="text-gray-600">{w.assistanceText}</span></span>
                    </label>
                    {assistance && (
                      <textarea className={`${input} mt-3`} rows={2} value={assistanceNote} onChange={e => setAssistanceNote(e.target.value)} placeholder={w.assistancePlaceholder} />
                    )}
                  </div>
                )}
                {!assistance && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-800">{w.howToPay}</p>
                    {canPayCard && (
                      <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer ${paymentMethod === 'card' ? 'bg-[#FFFDF8]' : 'border-gray-200'}`} style={paymentMethod === 'card' ? { borderColor: accent } : undefined}>
                        <input type="radio" className="mt-1" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                        <span><span className="font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> {w.payCard}</span><span className="text-sm text-gray-500">{w.payCardHint}</span></span>
                      </label>
                    )}
                    {canPayOffice && (
                      <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer ${paymentMethod === 'office' ? 'bg-[#FFFDF8]' : 'border-gray-200'}`} style={paymentMethod === 'office' ? { borderColor: accent } : undefined}>
                        <input type="radio" className="mt-1" checked={paymentMethod === 'office'} onChange={() => setPaymentMethod('office')} />
                        <span><span className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> {w.payOffice}</span>
                          <span className="text-sm text-gray-500">{props.officeInstructions || w.payOfficeHint}</span></span>
                      </label>
                    )}
                    {!canPayCard && !canPayOffice && <p className="text-sm text-red-600">{w.noPayment}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
        {uploadReport.some(r => !r.ok) && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{w.uploadIssues}</div>
        )}

        <div className="flex items-center justify-between mt-7 pt-5 border-t border-gray-100">
          {step > 0 ? (
            <button type="button" onClick={back} disabled={!!busy} className="inline-flex items-center gap-1 text-[#1E3A5F] px-3 py-2 rounded-lg hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /> {t.common.back}</button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" onClick={next} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-[#1E3A5F] px-6 py-3 text-white font-medium disabled:bg-gray-300">
              {busy === 'quote' && <Loader2 className="h-4 w-4 animate-spin" />} {step === 2 ? w.review : t.common.continue} <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!!busy || !quote || (quote.total > 0 && !assistance && !canPayCard && !canPayOffice)}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-white font-semibold disabled:bg-gray-300" style={{ backgroundColor: busy || !quote ? undefined : accent }}>
              {busy && busy !== 'quote' ? <><Loader2 className="h-4 w-4 animate-spin" /> {busy === 'submit' ? w.saving : busy}</>
                : quote && quote.total > 0 && !assistance && paymentMethod === 'card' && canPayCard ? w.continueToPayment(formatMoney(quote.total)) : w.submit}
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">{w.privacy(props.organizationName)}</p>
    </div>
  )
}
