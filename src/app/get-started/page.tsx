'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, User, FileText, MessageSquare, Check, Loader2, ArrowRight, CheckCircle, ClipboardList, Sparkles } from 'lucide-react'
import { getTier } from '@/lib/subscription-tiers'
import {
  ATTENDEE_COUNTS, CURRENT_TOOLS, EMPTY_NEEDS, EVENT_COUNTS, EVENT_FEATURES, EVENT_KINDS, FAMILY_COUNTS, LUX_EVENT_COUNTS,
  LUX_PROGRAMS, NEED_KINDS, PAYMENT_OPTIONS, SPANISH_OPTIONS, START_OPTIONS, needsProblem, suggestedTier,
  type NeedKind, type OnboardingNeeds,
} from '@/lib/onboarding-needs'

const organizationTypes = [
  { value: 'parish', label: 'Parish' },
  { value: 'diocese', label: 'Diocese' },
  { value: 'archdiocese', label: 'Archdiocese' },
  { value: 'school', label: 'School' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'retreat_center', label: 'Retreat Center' },
  { value: 'seminary', label: 'Seminary' },
  { value: 'other', label: 'Other' },
]

const howDidYouHearOptions = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'referral', label: 'Referral from another organization' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'conference_event', label: 'Conference/Event' },
  { value: 'other', label: 'Other' },
]

const LUX_TIERS = ['chapel', 'parish']
const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F]'

type Option = { value: string; label: string }

function Section({ icon: Icon, title, description, children }: {
  icon: typeof Building2
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5 text-[#1E3A5F]" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {description && <p className="text-sm text-gray-500 mb-5">{description}</p>}
      <div className={description ? '' : 'mt-5'}>{children}</div>
    </div>
  )
}

function Question({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-1">{label}</p>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </div>
  )
}

/** One answer from a set of buttons */
function Choice({ options, value, onChange, columns = 3 }: { options: Option[]; value: string; onChange: (v: string) => void; columns?: 2 | 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 3 ? 'md:grid-cols-3' : ''} gap-2`}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`flex items-center gap-2 p-3 border rounded-lg text-left text-sm transition-colors ${
            value === o.value ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 text-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-300'
          }`}>
          <span className="flex-1">{o.label}</span>
          {value === o.value && <Check className="h-4 w-4 text-[#1E3A5F] shrink-0" />}
        </button>
      ))}
    </div>
  )
}

/** Any number of answers, as toggle chips */
function Chips({ options, values, onChange }: { options: Option[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = values.includes(o.value)
        return (
          <button key={o.value} type="button" aria-pressed={on}
            onClick={() => onChange(on ? values.filter(v => v !== o.value) : [...values, o.value])}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
              on ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}>
            {on && <Check className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function GetStartedPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    website: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactJobTitle: '',
    legalEntityName: '',
    taxId: '',
    billingAddressLine1: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCycle: 'monthly',
    paymentMethod: 'credit_card',
    howDidYouHear: '',
    howDidYouHearOther: '',
    additionalNotes: '',
    agreedToTerms: false,
  })
  const [kind, setKind] = useState<NeedKind | ''>('')
  const [needs, setNeeds] = useState<OnboardingNeeds>(EMPTY_NEEDS)
  const setNeed = (patch: Partial<OnboardingNeeds>) => setNeeds(prev => ({ ...prev, ...patch }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const chooseKind = (value: NeedKind) => {
    setKind(value)
    setNeeds(prev => ({ ...prev, kind: value }))
    // Chapel and Parish are monthly only
    if (value === 'lux') setFormData(prev => ({ ...prev, billingCycle: 'monthly' }))
  }

  // /get-started?tier=chapel from the pricing cards preselects what they need and the plan
  useEffect(() => {
    const tier = new URLSearchParams(window.location.search).get('tier')
    if (!tier) return
    if (LUX_TIERS.includes(tier)) {
      setKind('lux')
      setNeeds(prev => ({ ...prev, kind: 'lux', luxEvents: LUX_EVENT_COUNTS.find(o => o.tier === tier)?.value ?? '' }))
    } else if (getTier(tier)) {
      setKind('events')
      setNeeds(prev => ({ ...prev, kind: 'events', events: EVENT_COUNTS.find(o => o.tier === tier)?.value ?? '' }))
    }
  }, [])

  const showLux = kind === 'lux' || kind === 'both'
  const showEvents = kind === 'events' || kind === 'both'
  const plan = kind ? getTier(suggestedTier({ ...needs, kind })) : undefined
  const fail = (message: string) => {
    setError(message)
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kind) return fail('Choose what you need: parish life, larger events, or both.')
    const problem = needsProblem({ ...needs, kind })
    if (problem) return fail(problem)
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/onboarding-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          billingAddress: [formData.billingAddressLine1, `${formData.billingCity}, ${formData.billingState} ${formData.billingZip}`.trim()]
            .filter(line => line && line !== ',').join('\n'),
          needs: { ...needs, kind },
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit application')
      }
      setSubmitted(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F5F1E8] to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your interest in ChiRho Events! We&apos;ll review what you need and email {formData.contactEmail || 'you'} soon, usually within one business day.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2A4A6F] transition-colors font-medium">
            Return to Homepage
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1E8] to-white">
      <header className="bg-[#1E3A5F] text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={180} height={45} className="h-10 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-[#E8DCC8] hover:text-white transition-colors">Back to Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1E3A5F] mb-4">Start Using ChiRho Events</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tell us what you need and we&apos;ll set up your account to fit. It takes about five minutes. Once approved,
            you&apos;ll get your login and can start right away.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
          <Section icon={Sparkles} title="What do you need?" description="Pick the one that fits best. You can always add more later.">
            <div className="grid grid-cols-1 gap-3">
              {NEED_KINDS.map(option => (
                <button key={option.value} type="button" onClick={() => chooseKind(option.value as NeedKind)} aria-pressed={kind === option.value}
                  className={`flex gap-3 p-4 border rounded-lg text-left transition-colors ${
                    kind === option.value ? 'border-[#1E3A5F] bg-[#1E3A5F]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                    <span className="block text-sm text-gray-600 mt-1">{option.description}</span>
                  </span>
                  {kind === option.value && <Check className="h-5 w-5 text-[#1E3A5F] shrink-0" />}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Building2} title="Your Organization">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization name *</label>
                <input type="text" name="organizationName" value={formData.organizationName} onChange={handleChange} required className={inputClass}
                  placeholder={kind === 'lux' ? 'e.g., St. Mary Catholic Church' : 'e.g., Diocese of Oklahoma City'} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select name="organizationType" value={formData.organizationType} onChange={handleChange} required className={inputClass}>
                    <option value="">Select type...</option>
                    {organizationTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="text" inputMode="url" name="website" value={formData.website} onChange={handleChange} className={inputClass} placeholder="stmary.org" />
                </div>
              </div>
            </div>
          </Section>

          <Section icon={User} title="About You">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                <input type="text" name="contactFirstName" value={formData.contactFirstName} onChange={handleChange} required autoComplete="given-name" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                <input type="text" name="contactLastName" value={formData.contactLastName} onChange={handleChange} required autoComplete="family-name" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} required autoComplete="email" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} required autoComplete="tel" className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your role</label>
                <input type="text" name="contactJobTitle" value={formData.contactJobTitle} onChange={handleChange} className={inputClass}
                  placeholder={kind === 'lux' ? 'e.g., Director of Religious Education, Parish Secretary' : 'e.g., Youth Ministry Director'} />
              </div>
            </div>
          </Section>

          {kind && (
            <Section icon={ClipboardList} title="Tell Us What You Need" description="So we can set things up for you before your first login.">
              <div className="space-y-6">
                {showLux && (
                  <>
                    <Question label="What do families register for? *" hint="Choose all that apply.">
                      <Chips options={LUX_PROGRAMS} values={needs.programs} onChange={programs => setNeed({ programs })} />
                    </Question>
                    <Question label="About how many families register each year?">
                      <Choice options={FAMILY_COUNTS} value={needs.families} onChange={families => setNeed({ families })} columns={2} />
                    </Question>
                    <Question label="How many parish events (fish fry, retreat, volunteer sign-ups) do you run a year? *" hint="Faith formation and sacrament programs are unlimited on every plan.">
                      <Choice options={LUX_EVENT_COUNTS} value={needs.luxEvents} onChange={luxEvents => setNeed({ luxEvents })} />
                    </Question>
                    <Question label="Do any of your families prefer Spanish?" hint="Families can switch every page and email to Spanish with one click.">
                      <Choice options={SPANISH_OPTIONS} value={needs.spanish} onChange={spanish => setNeed({ spanish })} />
                    </Question>
                  </>
                )}
                {showEvents && (
                  <>
                    <Question label="How many larger events do you plan to run a year? *">
                      <Choice options={EVENT_COUNTS} value={needs.events} onChange={events => setNeed({ events })} />
                    </Question>
                    <Question label="About how many people attend all of them in a year? *">
                      <Choice options={ATTENDEE_COUNTS} value={needs.attendees} onChange={attendees => setNeed({ attendees })} />
                    </Question>
                    <Question label="What kinds of events?" hint="Choose all that apply.">
                      <Chips options={EVENT_KINDS} values={needs.eventKinds} onChange={eventKinds => setNeed({ eventKinds })} />
                    </Question>
                    <Question label="Which of these do you need?" hint="Choose all that apply.">
                      <Chips options={EVENT_FEATURES} values={needs.features} onChange={features => setNeed({ features })} />
                    </Question>
                  </>
                )}
                <Question label="Do you want to take card payments online?" hint="Payments go straight to your bank account through Stripe.">
                  <Choice options={PAYMENT_OPTIONS} value={needs.onlinePayments} onChange={onlinePayments => setNeed({ onlinePayments })} />
                </Question>
                <Question label="What do you use for registration today?" hint="Choose all that apply. We can help bring things over.">
                  <Chips options={CURRENT_TOOLS} values={needs.currentTools} onChange={currentTools => setNeed({ currentTools })} />
                  {needs.currentTools.includes('other') && (
                    <input type="text" value={needs.currentToolsOther} onChange={e => setNeed({ currentToolsOther: e.target.value })}
                      className={`${inputClass} mt-3`} placeholder="What do you use?" maxLength={200} />
                  )}
                </Question>
                <Question label="When would you like to start?">
                  <Choice options={START_OPTIONS} value={needs.start} onChange={start => setNeed({ start })} columns={2} />
                </Question>
              </div>
            </Section>
          )}

          <Section icon={FileText} title="Billing" description="For your plan's invoices.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legal name (if different)</label>
                  <input type="text" name="legalEntityName" value={formData.legalEntityName} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / EIN</label>
                  <input type="text" name="taxId" value={formData.taxId} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing address *</label>
                <input type="text" name="billingAddressLine1" value={formData.billingAddressLine1} onChange={handleChange} required autoComplete="street-address" className={inputClass} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input type="text" name="billingCity" value={formData.billingCity} onChange={handleChange} required autoComplete="address-level2" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input type="text" name="billingState" value={formData.billingState} onChange={handleChange} required autoComplete="address-level1" className={inputClass} maxLength={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                  <input type="text" name="billingZip" value={formData.billingZip} onChange={handleChange} required autoComplete="postal-code" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing cycle</label>
                  <select name="billingCycle" value={formData.billingCycle} onChange={handleChange} className={inputClass}>
                    <option value="monthly">Monthly</option>
                    {kind !== 'lux' && <option value="annual">Annual (save 2 months)</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay your plan by</label>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={inputClass}>
                    <option value="credit_card">Credit card</option>
                    <option value="check">Check</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <Section icon={MessageSquare} title="Anything Else?">
            <div className="space-y-4">
              <Question label="How did you hear about us?">
                <Choice options={howDidYouHearOptions} value={formData.howDidYouHear}
                  onChange={v => setFormData(prev => ({ ...prev, howDidYouHear: v }))} />
              </Question>
              {formData.howDidYouHear === 'other' && (
                <input type="text" name="howDidYouHearOther" value={formData.howDidYouHearOther} onChange={handleChange} className={inputClass} placeholder="Please tell us where" />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anything else we should know?</label>
                <textarea name="additionalNotes" value={formData.additionalNotes} onChange={handleChange} rows={4} className={inputClass}
                  placeholder="Deadlines coming up, questions, or anything that would help us set you up." />
              </div>
            </div>
          </Section>

          {plan && (
            <div className="rounded-xl border border-[#1E3A5F]/20 bg-white p-5">
              <p className="text-sm text-gray-500">Based on your answers, we suggest</p>
              <p className="text-xl font-bold text-[#1E3A5F] mt-1">
                {plan.name} plan · ${plan.monthlyPrice}/month
                {formData.billingCycle === 'annual' && plan.annualPrice ? ` or $${plan.annualPrice.toLocaleString()}/year` : ''}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {plan.setupFee !== null ? `Plus a one-time ${plan.setupFeeLabel.toLowerCase()} of $${plan.setupFee}. ` : 'Setup is priced for your needs. '}
                {kind === 'both' ? 'Lux is turned on for your account too. ' : ''}
                We&apos;ll confirm everything with you before you pay.
              </p>
            </div>
          )}

          <div ref={errorRef}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
          </div>

          <div className="space-y-6">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleChange} required
                className="mt-1 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]" />
              <span className="text-sm text-gray-700">
                I agree to the <Link href="/terms" className="text-[#1E3A5F] hover:underline">Terms of Service</Link> and{' '}
                <Link href="/privacy" className="text-[#1E3A5F] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <div className="bg-[#F5F1E8] rounded-lg p-4 text-sm text-gray-700">
              After approval, you&apos;ll receive an invoice for your plan&apos;s setup fee ($50 for Chapel/Parish, $250 for Cathedral, $400 for Shrine,
              custom for Basilica) and your first subscription payment. Extra one-on-one help, training, or custom setup work is available at $90/hour.
            </div>

            <button type="submit" disabled={loading || !formData.agreedToTerms}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2A4A6F] transition-colors font-medium disabled:opacity-50">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Submit Application <ArrowRight className="h-5 w-5" /></>}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
