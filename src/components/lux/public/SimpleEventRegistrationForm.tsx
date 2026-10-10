'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, Loader2, CreditCard, Building2, ShieldCheck } from 'lucide-react'
import { formatMoney } from '@/lib/lux/format'
import type { FieldMode } from '@/lib/lux/simple-event'
import { dict, type LuxLang } from '@/lib/lux/i18n'

interface Ticket { id: string; name: string; description: string | null; price: number; remaining: number | null }
interface Question { id: string; questionText: string; questionType: string; options: string[]; required: boolean }

export interface SimpleEventRegistrationProps {
  slug: string
  tickets: Ticket[]
  questions: Question[]
  maxPerRegistration: number
  spotsLeft: number | null
  phoneField: FieldMode
  addressField: FieldMode
  waiver: { enabled: boolean; text: string }
  medical: boolean
  onlinePayment: boolean
  officePayment: { enabled: boolean; instructions: string }
  paymentsReady: boolean
  previousRegistrationId: string | null
  lang?: LuxLang
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A]'

export default function SimpleEventRegistrationForm(props: SimpleEventRegistrationProps) {
  const lang = props.lang ?? 'en'
  const t = dict(lang)
  const te = t.event
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => (props.tickets.length === 1 ? { [props.tickets[0].id]: 1 } : {})
  )
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', street: '', city: '', state: '', zip: '' })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [waiverSignature, setWaiverSignature] = useState('')
  const [medical, setMedical] = useState({ allergies: '', conditions: '', medications: '', emergencyContactName: '', emergencyContactPhone: '' })
  const canPayOnline = props.onlinePayment && props.paymentsReady
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'office'>(canPayOnline ? 'card' : 'office')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalQuantity = Object.values(quantities).reduce((s, q) => s + q, 0)
  const total = useMemo(
    () => props.tickets.reduce((s, t) => s + Math.round(t.price * 100) * (quantities[t.id] || 0), 0) / 100,
    [props.tickets, quantities]
  )
  const maxTotal = Math.min(props.maxPerRegistration, props.spotsLeft ?? Infinity)

  const setQty = (ticket: Ticket, next: number) => {
    const others = totalQuantity - (quantities[ticket.id] || 0)
    const cap = Math.min(ticket.remaining ?? Infinity, maxTotal - others)
    setQuantities(q => ({ ...q, [ticket.id]: Math.max(0, Math.min(next, cap)) }))
  }

  const toggleMulti = (questionId: string, option: string) => {
    const current = (answers[questionId] || '').split(', ').filter(Boolean)
    const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option]
    setAnswers(a => ({ ...a, [questionId]: next.join(', ') }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (totalQuantity === 0) {
      setError(te.chooseAtLeastOne)
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch(`/api/lux/public/events/${props.slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tickets: Object.entries(quantities).map(([optionId, quantity]) => ({ optionId, quantity })),
          answers: Object.entries(answers).map(([questionId, answerText]) => ({ questionId, answerText })),
          waiverAccepted,
          waiverSignature,
          medical,
          paymentMethod: total > 0 ? paymentMethod : undefined,
          previousRegistrationId: props.previousRegistrationId,
          language: lang,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (data.alreadyPaid) {
        window.location.href = `/lux/registered/${data.registrationId}`
        return
      }
      if (!response.ok) throw new Error(data.error || te.failed)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      window.location.href = `/lux/registered/${data.registrationId}`
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  const fieldLabel = (label: string, mode: FieldMode) => (
    <span className="block text-sm font-medium text-gray-800 mb-1">{label}{mode === 'required' ? <span className="text-red-600"> *</span> : <span className="text-gray-400 font-normal"> {t.common.optional}</span>}</span>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      <section>
        <h3 className="font-semibold text-[#1E3A5F] mb-3">{te.tickets}</h3>
        <div className="space-y-2">
          {props.tickets.map(tk => {
            const qty = quantities[tk.id] || 0
            const soldOut = tk.remaining === 0
            return (
              <div key={tk.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{tk.name}</p>
                  <p className="text-sm text-gray-500">
                    {tk.price > 0 ? formatMoney(tk.price) : t.common.free}
                    {tk.description ? ` · ${tk.description}` : ''}
                    {soldOut ? ` · ${te.soldOut}` : tk.remaining !== null && tk.remaining <= 10 ? ` · ${te.left(tk.remaining)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQty(tk, qty - 1)} disabled={qty === 0}
                    className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-30" aria-label={te.fewer(tk.name)}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold" aria-live="polite">{qty}</span>
                  <button type="button" onClick={() => setQty(tk, qty + 1)} disabled={soldOut || totalQuantity >= maxTotal}
                    className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-30" aria-label={te.more(tk.name)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {totalQuantity >= maxTotal && maxTotal > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {props.spotsLeft !== null && props.spotsLeft <= props.maxPerRegistration
              ? `${te.spotsLeft(props.spotsLeft)}.`
              : te.perRegistration(props.maxPerRegistration)}
          </p>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-[#1E3A5F] mb-3">{te.yourInfo}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label><span className="block text-sm font-medium text-gray-800 mb-1">{t.common.firstName} <span className="text-red-600">*</span></span>
            <input className={input} required autoComplete="given-name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></label>
          <label><span className="block text-sm font-medium text-gray-800 mb-1">{t.common.lastName} <span className="text-red-600">*</span></span>
            <input className={input} required autoComplete="family-name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></label>
          <label className="sm:col-span-2"><span className="block text-sm font-medium text-gray-800 mb-1">{t.common.email} <span className="text-red-600">*</span></span>
            <input className={input} type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <span className="block text-xs text-gray-500 mt-1">{te.confirmationHint}</span></label>
          {props.phoneField !== 'hidden' && (
            <label className="sm:col-span-2">{fieldLabel(t.common.phone, props.phoneField)}
              <input className={input} type="tel" autoComplete="tel" required={props.phoneField === 'required'} maxLength={20}
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          )}
          {props.addressField !== 'hidden' && (
            <>
              <label className="sm:col-span-2">{fieldLabel(t.common.street, props.addressField)}
                <input className={input} autoComplete="street-address" required={props.addressField === 'required'}
                  value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} /></label>
              <label>{fieldLabel(t.common.city, props.addressField)}
                <input className={input} autoComplete="address-level2" required={props.addressField === 'required'}
                  value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label>{fieldLabel(t.common.state, props.addressField)}
                  <input className={input} autoComplete="address-level1" maxLength={2} placeholder="TX" required={props.addressField === 'required'}
                    value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} /></label>
                <label>{fieldLabel(t.common.zip, props.addressField)}
                  <input className={input} autoComplete="postal-code" maxLength={10} required={props.addressField === 'required'}
                    value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></label>
              </div>
            </>
          )}
        </div>
      </section>

      {props.questions.length > 0 && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-3">{te.aFewQuestions}</h3>
          <div className="space-y-4">
            {props.questions.map(q => (
              <div key={q.id}>
                <p className="text-sm font-medium text-gray-800 mb-1">{q.questionText}{q.required && <span className="text-red-600"> *</span>}</p>
                {q.questionType === 'text' && (
                  <input className={input} required={q.required} value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
                {q.questionType === 'yes_no' && (
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(o => (
                      <label key={o} className="flex items-center gap-2 text-sm">
                        <input type="radio" name={q.id} required={q.required} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} /> {o === 'Yes' ? t.common.yes : t.common.no}
                      </label>
                    ))}
                  </div>
                )}
                {q.questionType === 'dropdown' && (
                  <select className={input} required={q.required} value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}>
                    <option value="">{t.common.choose}</option>
                    {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {q.questionType === 'multiple_choice' && (
                  <div className="space-y-1">
                    {q.options.map(o => (
                      <label key={o} className="flex items-center gap-2 text-sm">
                        <input type="radio" name={q.id} required={q.required} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} /> {o}
                      </label>
                    ))}
                  </div>
                )}
                {q.questionType === 'multi_select' && (
                  <div className="space-y-1">
                    {q.options.map(o => (
                      <label key={o} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={(answers[q.id] || '').split(', ').includes(o)} onChange={() => toggleMulti(q.id, o)} /> {o}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {props.medical && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-1">{te.medical}</h3>
          <p className="text-sm text-gray-500 mb-3">{te.medicalHint}</p>
          <div className="grid grid-cols-1 gap-3">
            <label><span className="block text-sm text-gray-800 mb-1">{t.common.allergies}</span>
              <input className={input} value={medical.allergies} onChange={ev => setMedical({ ...medical, allergies: ev.target.value })} placeholder={t.common.none} /></label>
            <label><span className="block text-sm text-gray-800 mb-1">{te.conditions}</span>
              <input className={input} value={medical.conditions} onChange={e => setMedical({ ...medical, conditions: e.target.value })} /></label>
            <label><span className="block text-sm text-gray-800 mb-1">{te.medications}</span>
              <input className={input} value={medical.medications} onChange={e => setMedical({ ...medical, medications: e.target.value })} /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label><span className="block text-sm text-gray-800 mb-1">{te.emergencyContact}</span>
                <input className={input} value={medical.emergencyContactName} onChange={e => setMedical({ ...medical, emergencyContactName: e.target.value })} /></label>
              <label><span className="block text-sm text-gray-800 mb-1">{te.emergencyPhone}</span>
                <input className={input} type="tel" maxLength={20} value={medical.emergencyContactPhone} onChange={e => setMedical({ ...medical, emergencyContactPhone: e.target.value })} /></label>
            </div>
          </div>
        </section>
      )}

      {props.waiver.enabled && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-2 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#C8A24A]" /> {te.waiver}</h3>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">{props.waiver.text}</div>
          <label className="flex items-start gap-2 mt-3 text-sm text-gray-800">
            <input type="checkbox" className="mt-1" checked={waiverAccepted} onChange={e => setWaiverAccepted(e.target.checked)} required />
            {te.waiverAgree}
          </label>
          <label className="block mt-3">
            <span className="block text-sm font-medium text-gray-800 mb-1">{te.waiverSign} <span className="text-red-600">*</span></span>
            <input className={input} required value={waiverSignature} onChange={e => setWaiverSignature(e.target.value)} placeholder={`${form.firstName} ${form.lastName}`.trim() || te.fullName} />
          </label>
        </section>
      )}

      {total > 0 && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-3">{te.payment}</h3>
          <div className="space-y-2">
            {canPayOnline && (
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${paymentMethod === 'card' ? 'border-[#C8A24A] bg-[#FFFDF8]' : 'border-gray-200'}`}>
                <input type="radio" name="payment" className="mt-1" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                <span><span className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> {t.wizard.payCard}</span>
                  <span className="text-sm text-gray-500">{te.payCardHint}</span></span>
              </label>
            )}
            {props.officePayment.enabled && (
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${paymentMethod === 'office' ? 'border-[#C8A24A] bg-[#FFFDF8]' : 'border-gray-200'}`}>
                <input type="radio" name="payment" className="mt-1" checked={paymentMethod === 'office'} onChange={() => setPaymentMethod('office')} />
                <span><span className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4" /> {t.wizard.payOffice}</span>
                  <span className="text-sm text-gray-500">{props.officePayment.instructions || te.payOfficeHint}</span></span>
              </label>
            )}
          </div>
        </section>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
        <div>
          <p className="text-sm text-gray-500">{te.ticketsCount(totalQuantity)}</p>
          <p className="text-xl font-semibold text-[#1E3A5F]">{totalQuantity === 0 ? te.chooseTickets : total > 0 ? formatMoney(total) : t.common.free}</p>
        </div>
        <button type="submit" disabled={submitting || totalQuantity === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-6 py-3 text-white font-medium hover:bg-[#162C48] disabled:bg-gray-300">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {total > 0 && paymentMethod === 'card' && canPayOnline ? te.continueToPayment : te.register}
        </button>
      </div>
    </form>
  )
}
