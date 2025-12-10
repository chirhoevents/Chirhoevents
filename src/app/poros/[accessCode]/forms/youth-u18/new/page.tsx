'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function YouthU18InitialForm() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    tShirtSize: '',
    parentEmail: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate age
    const age = parseInt(formData.age)
    if (age < 12 || age > 17) {
      setError('Age must be between 12 and 17 for Youth Under 18 forms')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/liability/youth-u18/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: accessCode,
          first_name: formData.firstName,
          last_name: formData.lastName,
          preferred_name: formData.preferredName || null,
          date_of_birth: formData.dateOfBirth,
          age: parseInt(formData.age),
          gender: formData.gender,
          t_shirt_size: formData.tShirtSize,
          parent_email: formData.parentEmail,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send form to parent')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-navy py-6 shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <Image
                src="/Poros logo.png"
                alt="Poros - ChiRho Events"
                width={350}
                height={105}
                className="h-16 md:h-20 w-auto"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-navy mb-3">✅ Email Sent!</h1>
              <p className="text-lg text-gray-700 mb-6">
                We&apos;ve sent an email to <strong>{formData.parentEmail}</strong> with a link to complete your form.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-semibold text-navy mb-3">What happens next?</h3>
                <ol className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="font-bold text-blue-600 mr-2">1.</span>
                    <span>Your parent clicks the link in the email</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-blue-600 mr-2">2.</span>
                    <span>They complete medical info, emergency contacts, and sign</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-blue-600 mr-2">3.</span>
                    <span>You&apos;re all set!</span>
                  </li>
                </ol>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Your parent should receive the email within a few minutes. If they don&apos;t see it, ask them to check their spam folder.
              </p>

              <button
                onClick={() => router.push(`/poros/${accessCode}`)}
                className="bg-navy text-white px-8 py-3 rounded-lg font-semibold hover:bg-navy/90 transition-colors"
              >
                Back to Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Image
              src="/Poros logo.png"
              alt="Poros - ChiRho Events"
              width={350}
              height={105}
              className="h-16 md:h-20 w-auto"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center text-navy hover:text-navy/80 mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-navy mb-2">Youth Under 18 Liability Form</h1>
            <p className="text-gray-600 mb-6">Fill out your basic information below</p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800">
                  Your parent/guardian will receive an email to complete the medical and consent sections of this form
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Name <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="If different from first name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="12"
                    max="17"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be 12-17</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  T-Shirt Size <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.tShirtSize}
                  onChange={(e) => setFormData({ ...formData, tShirtSize: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                >
                  <option value="">Select Size</option>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                  <option value="2XL">2XL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent/Guardian Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="parent@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  They will receive an email with a link to complete the form
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white py-3 px-6 rounded-lg text-lg font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send to Parent'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
