'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function YouthU18Form() {
  const params = useParams()
  const accessCode = params.accessCode as string
  const [form, setForm] = useState({
    firstName: '', lastName: '', preferredName: '',
    dateOfBirth: '', age: '', gender: '', tShirtSize: '', parentEmail: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const age = parseInt(form.age)
    if (age < 12 || age > 17) {
      setError('Age must be between 12 and 17 for Youth Under 18 forms')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 500)
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-3">✅ Email Sent!</h1>
            <p className="text-lg text-gray-700 mb-6">
              We&apos;ve sent an email to <strong>{form.parentEmail}</strong> with a link to complete your form.
            </p>
            <p className="text-sm text-gray-600 mb-8">
              Your parent or guardian will need to click the link, review the waiver terms, and sign
              on your behalf. Once they finish, your waiver will be marked complete.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900 mb-6 text-left">
              <p className="font-medium mb-1">Demo mode</p>
              <p>No email was actually sent. In production, the parent gets a secure one-time link
              that takes them to a full page with waiver text, medical fields, emergency contact
              info, and their e-signature.</p>
            </div>
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href={`/demo/poros/${accessCode}`} className="text-sm text-[#1E3A5F] hover:underline">
              ← Different role
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">Youth Under 18 — Initial Info</h1>
              <p className="text-gray-600">
                Enter your info. We&apos;ll send your parent an email to complete the waiver.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="First name" value={form.firstName} onChange={(v) => set('firstName', v)} required />
                <F label="Last name" value={form.lastName} onChange={(v) => set('lastName', v)} required />
              </div>
              <F label="Preferred name (optional)" value={form.preferredName} onChange={(v) => set('preferredName', v)} />
              <div className="grid grid-cols-2 gap-3">
                <F label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} required />
                <F label="Age" type="number" value={form.age} onChange={(v) => set('age', v)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">T-shirt size</label>
                  <select value={form.tShirtSize} onChange={(e) => set('tShirtSize', e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    <option value="">Select...</option>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <F label="Parent's email" type="email" value={form.parentEmail} onChange={(v) => set('parentEmail', v)} required />
              <p className="text-xs text-gray-500 -mt-2">
                We&apos;ll email your parent a link to the full waiver. They need to complete it before the event.
              </p>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E3A5F] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-[#2A4A6F] transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending email to parent...' : 'Send Form to Parent'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function F({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466]"
      />
    </div>
  )
}
