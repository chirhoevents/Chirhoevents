'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function YouthO18ChaperoneForm() {
  const params = useParams()
  const accessCode = params.accessCode as string
  const [form, setForm] = useState({
    firstName: '', lastName: '', preferredName: '',
    dateOfBirth: '', age: '', gender: '', tShirtSize: '',
    email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyRelation: '',
    allergies: '', medications: '', medicalConditions: '',
    insuranceProvider: '', insurancePolicyNumber: '',
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
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-3">✅ Waiver Submitted</h1>
            <p className="text-lg text-gray-700 mb-6">
              Thanks, <strong>{form.firstName} {form.lastName}</strong>! Your waiver is on file and you&apos;re all set for the event.
            </p>
            <p className="text-sm text-gray-600 mb-8">
              A copy has been emailed to <strong>{form.email}</strong>.
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">Youth 18+ / Chaperone Waiver</h1>
              <p className="text-gray-600">Complete this form yourself. All fields required unless noted.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal */}
              <Section title="Personal Information">
                <div className="grid grid-cols-2 gap-3">
                  <F label="First name" value={form.firstName} onChange={(v) => set('firstName', v)} required />
                  <F label="Last name" value={form.lastName} onChange={(v) => set('lastName', v)} required />
                </div>
                <F label="Preferred name (optional)" value={form.preferredName} onChange={(v) => set('preferredName', v)} />
                <div className="grid grid-cols-3 gap-3">
                  <F label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} required />
                  <F label="Age" type="number" value={form.age} onChange={(v) => set('age', v)} required />
                  <Select label="T-shirt" value={form.tShirtSize} onChange={(v) => set('tShirtSize', v)} options={['XS', 'S', 'M', 'L', 'XL', 'XXL']} required />
                </div>
                <Select label="Gender" value={form.gender} onChange={(v) => set('gender', v)} options={['M', 'F']} required />
              </Section>

              {/* Contact */}
              <Section title="Contact Information">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
                  <F label="Phone" value={form.phone} onChange={(v) => set('phone', v)} required />
                </div>
                <F label="Address" value={form.address} onChange={(v) => set('address', v)} required />
                <div className="grid grid-cols-3 gap-3">
                  <F label="City" value={form.city} onChange={(v) => set('city', v)} required />
                  <F label="State" value={form.state} onChange={(v) => set('state', v)} required />
                  <F label="ZIP" value={form.zip} onChange={(v) => set('zip', v)} required />
                </div>
              </Section>

              {/* Emergency */}
              <Section title="Emergency Contact">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Name" value={form.emergencyContactName} onChange={(v) => set('emergencyContactName', v)} required />
                  <F label="Phone" value={form.emergencyContactPhone} onChange={(v) => set('emergencyContactPhone', v)} required />
                </div>
                <F label="Relationship (e.g., spouse, parent)" value={form.emergencyRelation} onChange={(v) => set('emergencyRelation', v)} required />
              </Section>

              {/* Medical */}
              <Section title="Medical Information">
                <TA label="Allergies (list all, or 'None')" value={form.allergies} onChange={(v) => set('allergies', v)} required />
                <TA label="Current medications" value={form.medications} onChange={(v) => set('medications', v)} required />
                <TA label="Medical conditions we should know about" value={form.medicalConditions} onChange={(v) => set('medicalConditions', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <F label="Insurance provider" value={form.insuranceProvider} onChange={(v) => set('insuranceProvider', v)} required />
                  <F label="Policy number" value={form.insurancePolicyNumber} onChange={(v) => set('insurancePolicyNumber', v)} required />
                </div>
              </Section>

              {/* Consents */}
              <Section title="Consents & Waiver">
                <Check
                  label="Photo / video release: I permit event photography that may include me."
                  checked={form.photoRelease}
                  onChange={(v) => set('photoRelease', v)}
                />
                <Check
                  label="Emergency medical treatment: I authorize event medical staff to administer first aid and, if needed, arrange transport to a medical facility."
                  checked={form.medicalTreatmentConsent}
                  onChange={(v) => set('medicalTreatmentConsent', v)}
                  required
                />
                <div className="rounded border border-slate-200 bg-[#F5F1E8] p-4 text-sm text-slate-700 max-h-48 overflow-y-auto">
                  <p className="font-semibold mb-2">Liability Waiver</p>
                  <p className="mb-2">
                    I acknowledge that participation in the event involves risks including but not
                    limited to physical injury, illness, or emotional distress. I agree to release
                    the organizer, its officers, staff, and volunteers from all claims arising from
                    my participation in the event.
                  </p>
                  <p className="mb-2">
                    I agree to abide by the event&apos;s Code of Conduct including appropriate
                    behavior, respect for staff and other participants, and compliance with all
                    event rules.
                  </p>
                  <p className="text-xs italic">(Placeholder text for demonstration purposes only.)</p>
                </div>
                <Check
                  label="I have read and agree to the waiver above."
                  checked={form.waiverAgreed}
                  onChange={(v) => set('waiverAgreed', v)}
                  required
                />
                <F label="Type your full name as signature" value={form.signerName} onChange={(v) => set('signerName', v)} required />
              </Section>

              <button
                type="submit"
                disabled={loading || !form.waiverAgreed || !form.medicalTreatmentConsent}
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

function TA({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} required={required} rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466]" />
    </div>
  )
}

function Select({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white">
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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
