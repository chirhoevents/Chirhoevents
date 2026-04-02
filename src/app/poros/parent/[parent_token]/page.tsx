'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import DynamicLiabilityForm, {
  EMPTY_DYNAMIC_VALUES,
  getConsentVisibility,
  type DynamicFormValues,
  type FormConfig,
} from '@/components/poros/DynamicLiabilityForm'

interface YouthInfo {
  firstName: string
  lastName: string
  age: number
  gender: string
  tShirtSize: string
}

export default function ParentCompletionForm() {
  const params = useParams()
  const parentToken = params.parent_token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [youthInfo, setYouthInfo] = useState<YouthInfo | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [participantType, setParticipantType] = useState<string>('youth_u18')
  const [submitted, setSubmitted] = useState(false)

  // Dynamic sections (medical, emergency contacts, insurance, etc.)
  const [dynValues, setDynValues] = useState<DynamicFormValues>(EMPTY_DYNAMIC_VALUES)
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)

  // Consent / signature
  const [consentData, setConsentData] = useState({
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
          const errData = await response.json()
          throw new Error(errData.error || 'Invalid or expired link')
        }

        const data = await response.json()
        setYouthInfo(data.youth_info)
        if (data.eventId) setEventId(data.eventId)
        if (data.participantType) setParticipantType(data.participantType)
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

  const handleDynChange = useCallback((key: string, value: string | boolean) => {
    setDynValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target
    setConsentData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cv = getConsentVisibility(formConfig)
    if (cv.showMedicalRelease && !consentData.consentMedical) {
      setError('Medical consent is required')
      return
    }
    if (!consentData.consentActivity) {
      setError('Activity waiver consent is required')
      return
    }
    if (cv.showPhotoConsent && !consentData.consentPhoto) {
      setError('Photo release consent is required')
      return
    }
    if (cv.showTransportationConsent && !consentData.consentTransportation) {
      setError('Transportation consent is required')
      return
    }

    if (!consentData.certifyAccurate) {
      setError('You must certify that the information is accurate')
      return
    }

    if (youthInfo && consentData.signatureFullName && consentData.signatureInitials) {
      const nameParts = consentData.signatureFullName.trim().split(' ')
      if (nameParts.length < 2) {
        setError('Please enter your full legal name (first and last)')
        return
      }
      const expectedInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      if (consentData.signatureInitials.toUpperCase() !== expectedInitials) {
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
          medical_conditions: dynValues.medicalConditions,
          medications: dynValues.medications,
          allergies: dynValues.allergies,
          dietary_restrictions: dynValues.dietaryRestrictions,
          ada_accommodations: dynValues.adaAccommodations,
          emergency_contact_1_name: dynValues.emergencyContact1Name,
          emergency_contact_1_phone: dynValues.emergencyContact1Phone,
          emergency_contact_1_relation: dynValues.emergencyContact1Relation,
          emergency_contact_2_name: dynValues.emergencyContact2Name || null,
          emergency_contact_2_phone: dynValues.emergencyContact2Phone || null,
          emergency_contact_2_relation: dynValues.emergencyContact2Relation || null,
          insurance_provider: dynValues.insuranceProvider,
          insurance_policy_number: dynValues.insurancePolicyNumber,
          insurance_group_number: dynValues.insuranceGroupNumber || null,
          signature_full_name: consentData.signatureFullName,
          signature_initials: consentData.signatureInitials,
          signature_date: new Date().toISOString().split('T')[0],
          certify_accurate: consentData.certifyAccurate,
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

              <h1 className="text-3xl font-bold text-navy mb-3">Thank You!</h1>
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

  const cv = getConsentVisibility(formConfig)

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

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dynamic sections — medical, emergency contacts, insurance, etc. */}
            {eventId && (
              <DynamicLiabilityForm
                eventId={eventId}
                participantType={participantType}
                sectionOffset={1}
                values={dynValues}
                onChange={handleDynChange}
                onConfigLoaded={setFormConfig}
              />
            )}

            {/* E-Signature & Consent */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy mb-6">E-Signature &amp; Consent</h2>

              <div className="space-y-4 mb-8">
                {cv.showMedicalRelease && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentMedical"
                      required
                      checked={consentData.consentMedical}
                      onChange={handleConsentChange}
                      className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Medical Consent:</strong> I authorize event staff to provide or arrange for medical care in case of emergency
                    </span>
                  </label>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="consentActivity"
                    required
                    checked={consentData.consentActivity}
                    onChange={handleConsentChange}
                    className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Activity Waiver:</strong> I understand activities may include physical activities and waive liability
                  </span>
                </label>

                {cv.showPhotoConsent && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentPhoto"
                      required
                      checked={consentData.consentPhoto}
                      onChange={handleConsentChange}
                      className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Photo Release:</strong> I grant permission for photos/videos to be taken
                    </span>
                  </label>
                )}

                {cv.showTransportationConsent && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentTransportation"
                      required
                      checked={consentData.consentTransportation}
                      onChange={handleConsentChange}
                      className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Transportation:</strong> I authorize transportation in emergency situations
                    </span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="signatureFullName"
                    required
                    value={consentData.signatureFullName}
                    onChange={handleConsentChange}
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
                    name="signatureInitials"
                    required
                    maxLength={2}
                    value={consentData.signatureInitials}
                    onChange={handleConsentChange}
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
                  name="certifyAccurate"
                  required
                  checked={consentData.certifyAccurate}
                  onChange={handleConsentChange}
                  className="mt-1 mr-3 h-5 w-5 text-navy border-gray-300 rounded focus:ring-gold"
                />
                <span className="text-sm text-gray-700">
                  <strong>I certify that the information provided is accurate and complete</strong>
                </span>
              </label>

              <p className="text-sm text-gray-600 mb-6">
                By signing, you agree to our{' '}
                <Link href="/privacy" target="_blank" className="text-gold hover:underline font-medium">
                  Privacy Policy
                </Link>{' '}
                and consent to the collection and use of the information provided as described therein.
              </p>

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
