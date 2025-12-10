'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

interface YouthInfo {
  firstName: string
  lastName: string
  age: number
  gender: string
  tShirtSize: string
}

export default function ParentCompletionForm() {
  const params = useParams()
  const router = useRouter()
  const parentToken = params.parent_token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [youthInfo, setYouthInfo] = useState<YouthInfo | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    medicalConditions: '',
    medications: '',
    allergies: '',
    dietaryRestrictions: '',
    adaAccommodations: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relation: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relation: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceGroupNumber: '',
    consentMedical: false,
    consentActivity: false,
    consentPhoto: false,
    consentTransportation: false,
    signatureFullName: '',
    signatureInitials: '',
    certifyAccurate: false,
  })

  useEffect(() => {
    async function loadForm() {
      try {
        const response = await fetch(`/api/liability/youth-u18/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_token: parentToken }),
        })

        if (!response.ok) {
          throw new Error('Invalid or expired link')
        }

        const data = await response.json()
        setYouthInfo(data.youth_info)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form')
      } finally {
        setLoading(false)
      }
    }

    if (parentToken) {
      loadForm()
    }
  }, [parentToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate all consents are checked
    if (!formData.consentMedical || !formData.consentActivity || !formData.consentPhoto || !formData.consentTransportation) {
      setError('Please check all consent boxes')
      return
    }

    // Validate initials match first and last name
    if (youthInfo && formData.signatureFullName && formData.signatureInitials) {
      const nameParts = formData.signatureFullName.trim().split(' ')
      if (nameParts.length < 2) {
        setError('Please enter your full legal name (first and last)')
        return
      }
      const expectedInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      if (formData.signatureInitials.toUpperCase() !== expectedInitials) {
        setError(`Initials should be ${expectedInitials} based on your name`)
        return
      }
    }

    setLoading(true)

    try {
      const response = await fetch('/api/liability/youth-u18/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_token: parentToken,
          medical_conditions: formData.medicalConditions,
          medications: formData.medications,
          allergies: formData.allergies,
          dietary_restrictions: formData.dietaryRestrictions,
          ada_accommodations: formData.adaAccommodations,
          emergency_contact_1_name: formData.emergencyContact1Name,
          emergency_contact_1_phone: formData.emergencyContact1Phone,
          emergency_contact_1_relation: formData.emergencyContact1Relation,
          emergency_contact_2_name: formData.emergencyContact2Name || null,
          emergency_contact_2_phone: formData.emergencyContact2Phone || null,
          emergency_contact_2_relation: formData.emergencyContact2Relation || null,
          insurance_provider: formData.insuranceProvider,
          insurance_policy_number: formData.insurancePolicyNumber,
          insurance_group_number: formData.insuranceGroupNumber || null,
          signature_full_name: formData.signatureFullName,
          signature_initials: formData.signatureInitials,
          signature_date: new Date().toISOString().split('T')[0],
          certify_accurate: formData.certifyAccurate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit form')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
          <p className="text-navy font-medium">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error && !youthInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            This link may have expired. Please contact your group leader for assistance.
          </p>
        </div>
      </div>
    )
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-navy mb-3">✅ Thank You!</h1>
              <p className="text-lg text-gray-700 mb-6">
                {youthInfo?.firstName}&apos;s liability form has been completed and submitted.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <p className="text-gray-700">
                  You should receive a confirmation email shortly.
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Have a great event!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!youthInfo) return null

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
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-navy mb-2">
              Complete Liability Form for {youthInfo.firstName} {youthInfo.lastName}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Age: {youthInfo.age}</span>
              <span>•</span>
              <span>Gender: {youthInfo.gender === 'male' ? 'Male' : 'Female'}</span>
              <span>•</span>
              <span>T-shirt: {youthInfo.tShirtSize}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Medical Information */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy mb-6">Medical Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Conditions
                  </label>
                  <textarea
                    value={formData.medicalConditions}
                    onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    rows={3}
                    placeholder="e.g., Asthma (controlled with inhaler)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    rows={3}
                    placeholder="e.g., Albuterol inhaler as needed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergies ⚠️
                  </label>
                  <textarea
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Please list all allergies (food, medication, environmental)"
                  />
                  <p className="text-xs text-red-600 mt-1">⚠️ Please be specific about all allergies</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <textarea
                    value={formData.dietaryRestrictions}
                    onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    rows={2}
                    placeholder="e.g., Vegetarian, gluten-free"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ADA Accommodations
                  </label>
                  <textarea
                    value={formData.adaAccommodations}
                    onChange={(e) => setFormData({ ...formData, adaAccommodations: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    rows={2}
                    placeholder="Any special accommodations needed"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy mb-6">Emergency Contacts</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-navy mb-4">Primary Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.emergencyContact1Name}
                        onChange={(e) => setFormData({ ...formData, emergencyContact1Name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.emergencyContact1Phone}
                        onChange={(e) => setFormData({ ...formData, emergencyContact1Phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                        placeholder="(XXX) XXX-XXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relation <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.emergencyContact1Relation}
                        onChange={(e) => setFormData({ ...formData, emergencyContact1Relation: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                        placeholder="e.g., Mother"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-navy mb-4">Secondary Emergency Contact (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={formData.emergencyContact2Name}
                        onChange={(e) => setFormData({ ...formData, emergencyContact2Name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.emergencyContact2Phone}
                        onChange={(e) => setFormData({ ...formData, emergencyContact2Phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                        placeholder="(XXX) XXX-XXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
                      <input
                        type="text"
                        value={formData.emergencyContact2Relation}
                        onChange={(e) => setFormData({ ...formData, emergencyContact2Relation: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                        placeholder="e.g., Father"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy mb-6">Insurance Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    placeholder="e.g., Blue Cross Blue Shield"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Number
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceGroupNumber}
                    onChange={(e) => setFormData({ ...formData, insuranceGroupNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  />
                </div>
              </div>
            </div>

            {/* E-Signature & Consent */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy mb-6">E-Signature & Consent</h2>

              <div className="space-y-4 mb-8">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentMedical}
                    onChange={(e) => setFormData({ ...formData, consentMedical: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Medical Consent:</strong> I authorize event staff to provide or arrange for medical care in case of emergency
                  </span>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentActivity}
                    onChange={(e) => setFormData({ ...formData, consentActivity: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Activity Waiver:</strong> I understand activities may include physical activities and waive liability
                  </span>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentPhoto}
                    onChange={(e) => setFormData({ ...formData, consentPhoto: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Photo Release:</strong> I grant permission for photos/videos to be taken
                  </span>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentTransportation}
                    onChange={(e) => setFormData({ ...formData, consentTransportation: e.target.checked })}
                    className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Transportation:</strong> I authorize transportation in emergency situations
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.signatureFullName}
                    onChange={(e) => setFormData({ ...formData, signatureFullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    placeholder="Type your full legal name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initials <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.signatureInitials}
                    onChange={(e) => setFormData({ ...formData, signatureInitials: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                    placeholder="FL"
                  />
                  <p className="text-xs text-gray-500 mt-1">First + Last initial</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="text"
                    disabled
                    value={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <label className="flex items-start mb-6">
                <input
                  type="checkbox"
                  required
                  checked={formData.certifyAccurate}
                  onChange={(e) => setFormData({ ...formData, certifyAccurate: e.target.checked })}
                  className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                />
                <span className="text-sm text-gray-700">
                  <strong>I certify that the information provided is accurate and complete</strong>
                </span>
              </label>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Submitting...' : 'Sign and Submit Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
