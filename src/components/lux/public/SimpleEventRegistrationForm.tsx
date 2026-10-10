'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, Loader2, CreditCard, Building2, ShieldCheck } from 'lucide-react'
import { formatMoney } from '@/lib/lux/format'
import type { FieldMode } from '@/lib/lux/simple-event'

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
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A]'

export default function SimpleEventRegistrationForm(props: SimpleEventRegistrationProps) {
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
      setError('Choose at least one ticket.')
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
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (data.alreadyPaid) {
        window.location.href = `/lux/registered/${data.registrationId}`
        return
      }
      if (!response.ok) throw new Error(data.error || 'Registration failed. Please try again.')
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
    <span className="block text-sm font-medium text-gray-800 mb-1">{label}{mode === 'required' ? <span className="text-red-600"> *</span> : <span className="text-gray-400 font-normal"> (optional)</span>}</span>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      <section>
        <h3 className="font-semibold text-[#1E3A5F] mb-3">Tickets</h3>
        <div className="space-y-2">
          {props.tickets.map(t => {
            const qty = quantities[t.id] || 0
            const soldOut = t.remaining === 0
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">
                    {t.price > 0 ? formatMoney(t.price) : 'Free'}
                    {t.description ? ` · ${t.description}` : ''}
                    {soldOut ? ' · Sold out' : t.remaining !== null && t.remaining <= 10 ? ` · ${t.remaining} left` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQty(t, qty - 1)} disabled={qty === 0}
                    className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-30" aria-label={`Fewer ${t.name}`}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold" aria-live="polite">{qty}</span>
                  <button type="button" onClick={() => setQty(t, qty + 1)} disabled={soldOut || totalQuantity >= maxTotal}
                    className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-30" aria-label={`More ${t.name}`}>
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
              ? `Only ${props.spotsLeft} spot${props.spotsLeft === 1 ? '' : 's'} left.`
              : `Up to ${props.maxPerRegistration} per registration.`}
          </p>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-[#1E3A5F] mb-3">Your information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label><span className="block text-sm font-medium text-gray-800 mb-1">First name <span className="text-red-600">*</span></span>
            <input className={input} required autoComplete="given-name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></label>
          <label><span className="block text-sm font-medium text-gray-800 mb-1">Last name <span className="text-red-600">*</span></span>
            <input className={input} required autoComplete="family-name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></label>
          <label className="sm:col-span-2"><span className="block text-sm font-medium text-gray-800 mb-1">Email <span className="text-red-600">*</span></span>
            <input className={input} type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <span className="block text-xs text-gray-500 mt-1">Your confirmation is sent here.</span></label>
          {props.phoneField !== 'hidden' && (
            <label className="sm:col-span-2">{fieldLabel('Phone', props.phoneField)}
              <input className={input} type="tel" autoComplete="tel" required={props.phoneField === 'required'} maxLength={20}
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          )}
          {props.addressField !== 'hidden' && (
            <>
              <label className="sm:col-span-2">{fieldLabel('Street address', props.addressField)}
                <input className={input} autoComplete="street-address" required={props.addressField === 'required'}
                  value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} /></label>
              <label>{fieldLabel('City', props.addressField)}
                <input className={input} autoComplete="address-level2" required={props.addressField === 'required'}
                  value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label>{fieldLabel('State', props.addressField)}
                  <input className={input} autoComplete="address-level1" maxLength={2} placeholder="TX" required={props.addressField === 'required'}
                    value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} /></label>
                <label>{fieldLabel('ZIP', props.addressField)}
                  <input className={input} autoComplete="postal-code" maxLength={10} required={props.addressField === 'required'}
                    value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></label>
              </div>
            </>
          )}
        </div>
      </section>

      {props.questions.length > 0 && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-3">A few questions</h3>
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
                        <input type="radio" name={q.id} required={q.required} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} /> {o}
                      </label>
                    ))}
                  </div>
                )}
                {q.questionType === 'dropdown' && (
                  <select className={input} required={q.required} value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}>
                    <option value="">Choose…</option>
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
          <h3 className="font-semibold text-[#1E3A5F] mb-1">Medical &amp; allergies</h3>
          <p className="text-sm text-gray-500 mb-3">For everyone you’re registering. Only parish staff can see this.</p>
          <div className="grid grid-cols-1 gap-3">
            <label><span className="block text-sm text-gray-800 mb-1">Allergies</span>
              <input className={input} value={medical.allergies} onChange={e => setMedical({ ...medical, allergies: e.target.value })} placeholder="None" /></label>
            <label><span className="block text-sm text-gray-800 mb-1">Medical conditions</span>
              <input className={input} value={medical.conditions} onChange={e => setMedical({ ...medical, conditions: e.target.value })} /></label>
            <label><span className="block text-sm text-gray-800 mb-1">Medications</span>
              <input className={input} value={medical.medications} onChange={e => setMedical({ ...medical, medications: e.target.value })} /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label><span className="block text-sm text-gray-800 mb-1">Emergency contact</span>
                <input className={input} value={medical.emergencyContactName} onChange={e => setMedical({ ...medical, emergencyContactName: e.target.value })} /></label>
              <label><span className="block text-sm text-gray-800 mb-1">Emergency phone</span>
                <input className={input} type="tel" maxLength={20} value={medical.emergencyContactPhone} onChange={e => setMedical({ ...medical, emergencyContactPhone: e.target.value })} /></label>
            </div>
          </div>
        </section>
      )}

      {props.waiver.enabled && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-2 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#C8A24A]" /> Waiver</h3>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">{props.waiver.text}</div>
          <label className="flex items-start gap-2 mt-3 text-sm text-gray-800">
            <input type="checkbox" className="mt-1" checked={waiverAccepted} onChange={e => setWaiverAccepted(e.target.checked)} required />
            I have read and agree to the waiver above, for myself and everyone I’m registering.
          </label>
          <label className="block mt-3">
            <span className="block text-sm font-medium text-gray-800 mb-1">Type your full name to sign <span className="text-red-600">*</span></span>
            <input className={input} required value={waiverSignature} onChange={e => setWaiverSignature(e.target.value)} placeholder={`${form.firstName} ${form.lastName}`.trim() || 'Full name'} />
          </label>
        </section>
      )}

      {total > 0 && (
        <section>
          <h3 className="font-semibold text-[#1E3A5F] mb-3">Payment</h3>
          <div className="space-y-2">
            {canPayOnline && (
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${paymentMethod === 'card' ? 'border-[#C8A24A] bg-[#FFFDF8]' : 'border-gray-200'}`}>
                <input type="radio" name="payment" className="mt-1" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                <span><span className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> Pay now by card</span>
                  <span className="text-sm text-gray-500">Secure checkout. You’ll get a receipt by email.</span></span>
              </label>
            )}
            {props.officePayment.enabled && (
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${paymentMethod === 'office' ? 'border-[#C8A24A] bg-[#FFFDF8]' : 'border-gray-200'}`}>
                <input type="radio" name="payment" className="mt-1" checked={paymentMethod === 'office'} onChange={() => setPaymentMethod('office')} />
                <span><span className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4" /> Pay at the parish office</span>
                  <span className="text-sm text-gray-500">{props.officePayment.instructions || 'Register now and pay with cash or check at the office.'}</span></span>
              </label>
            )}
          </div>
        </section>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
        <div>
          <p className="text-sm text-gray-500">{totalQuantity} ticket{totalQuantity === 1 ? '' : 's'}</p>
          <p className="text-xl font-semibold text-[#1E3A5F]">{total > 0 ? formatMoney(total) : 'Free'}</p>
        </div>
        <button type="submit" disabled={submitting || totalQuantity === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-6 py-3 text-white font-medium hover:bg-[#162C48] disabled:bg-gray-300">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {total > 0 && paymentMethod === 'card' && canPayOnline ? 'Continue to payment' : 'Register'}
        </button>
      </div>
    </form>
  )
}
