'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const CLERGY_ROLES = ['Priest', 'Deacon', 'Seminarian', 'Religious Sister', 'Religious Brother']

export default function ClergyForm() {
  const params = useParams()
  const accessCode = params.accessCode as string
  const [form, setForm] = useState({
    role: '',
    firstName: '', lastName: '', title: '',
    dateOfBirth: '', diocese: '', bishopName: '',
    email: '', phone: '',
    goodStandingLetterUploaded: false,
    photoRelease: false, medicalTreatmentConsent: false, waiverAgreed: false,
    signerName: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 500)
  }

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-36px)] bg-gray-50">
        <div className="bg-[#1E3A5F] py-6 shadow-md">
          <div className="container mx-auto px-4 flex justify-center">
            <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={280} height={84} className="h-14 md:h-16 w-auto" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-3">✅ Clergy Waiver Submitted</h1>
            <p className="text-lg text-gray-700 mb-6">
              Thank you, <strong>{form.title} {form.firstName} {form.lastName}</strong>. Your submission is on file.
            </p>
            <p className="text-sm text-gray-600 mb-8">
              The event organizer will verify your letter of good standing before the event. A confirmation
              email has been sent to <strong>{form.email}</strong>.
            </p>
            <Link href="/demo/poros" className="text-[#1E3A5F] hover:underline text-sm">
              ← Back to Poros home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-gray-50">
      <div className="bg-[#1E3A5F] py-6 shadow-md">
        <div className="container mx-auto px-4 flex justify-center">
          <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={280} height={84} className="h-14 md:h-16 w-auto" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href={`/demo/poros/${accessCode}`} className="text-sm text-[#1E3A5F] hover:underline">← Different role</Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">Clergy & Religious Waiver</h1>
              <p className="text-gray-600">Please select your role and complete the form.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Section title="Your Role">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {CLERGY_ROLES.map((r) => (
                    <label
                      key={r}
                      className={`p-3 border-2 rounded-lg cursor-pointer text-center ${
                        form.role === r ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input type="radio" checked={form.role === r} onChange={() => set('role', r)} className="sr-only" />
                      <span className="font-medium text-navy">{r}</span>
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="Personal Information">
                <div className="grid grid-cols-3 gap-3">
                  <F label="Title (Fr., Dcn., Sr., etc.)" value={form.title} onChange={(v) => set('title', v)} required />
                  <F label="First name" value={form.firstName} onChange={(v) => set('firstName', v)} required />
                  <F label="Last name" value={form.lastName} onChange={(v) => set('lastName', v)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} required />
                  <F label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
                </div>
                <F label="Phone" value={form.phone} onChange={(v) => set('phone', v)} required />
              </Section>

              <Section title="Diocese / Community">
                <F label="Diocese, order, or religious community" value={form.diocese} onChange={(v) => set('diocese', v)} required />
                <F label="Bishop / superior name" value={form.bishopName} onChange={(v) => set('bishopName', v)} required />
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Letter of Good Standing Required</p>
                  <p className="text-sm text-amber-800 mb-3">
                    We require a letter of good standing from your bishop or religious superior on official
                    diocesan / community letterhead, dated within the last 12 months.
                  </p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.goodStandingLetterUploaded}
                      onChange={(e) => set('goodStandingLetterUploaded', e.target.checked)}
                    />
                    <span>I have uploaded (or will email) my letter of good standing to the organizer.</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { alert('Demo: Would open file picker to upload the letter PDF.'); set('goodStandingLetterUploaded', true) }}
                    className="mt-2 text-sm text-purple-700 hover:underline"
                  >
                    Upload letter (demo)
                  </button>
                </div>
              </Section>

              <Section title="Consents & Waiver">
                <Check label="Photo / video release." checked={form.photoRelease} onChange={(v) => set('photoRelease', v)} />
                <Check label="Emergency medical treatment consent." checked={form.medicalTreatmentConsent} onChange={(v) => set('medicalTreatmentConsent', v)} required />
                <div className="rounded border border-slate-200 bg-[#F5F1E8] p-4 text-sm text-slate-700 max-h-48 overflow-y-auto">
                  <p className="font-semibold mb-2">Ministerial Waiver</p>
                  <p className="mb-2">
                    I affirm that I am in good standing with my diocese or religious community and have
                    provided (or will provide) a letter attesting to this fact.
                  </p>
                  <p className="mb-2">
                    I acknowledge participation in the event involves risks and release the organizer
                    from liability for injuries or losses arising from my participation.
                  </p>
                  <p className="mb-2">
                    I agree to abide by the event&apos;s ministerial code of conduct at all times.
                  </p>
                  <p className="text-xs italic">(Placeholder text for demonstration purposes only.)</p>
                </div>
                <Check label="I have read and agree to the waiver above." checked={form.waiverAgreed} onChange={(v) => set('waiverAgreed', v)} required />
                <F label="Type your full name as signature" value={form.signerName} onChange={(v) => set('signerName', v)} required />
              </Section>

              <button
                type="submit"
                disabled={loading || !form.waiverAgreed || !form.medicalTreatmentConsent || !form.role || !form.goodStandingLetterUploaded}
                className="w-full bg-[#1E3A5F] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-[#2A4A6F] transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Signed Waiver'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function F({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466]" />
    </div>
  )
}

function Check({ label, checked, onChange, required = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; required?: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required={required} className="mt-1" />
      <span>{label}</span>
    </label>
  )
}
