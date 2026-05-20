'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import DynamicLiabilityForm, {
  EMPTY_DYNAMIC_VALUES,
  getConsentVisibility,
  type DynamicFormValues,
  type FormConfig,
} from '@/components/poros/DynamicLiabilityForm'

export default function YouthO18ChaperoneForm() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  // Basic info (section 1) — hardcoded
  const [basicData, setBasicData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    participantType: '',
    tShirtSize: '',
  })

  // Dynamic sections (2+) — controlled by DynamicLiabilityForm
  const [dynValues, setDynValues] = useState<DynamicFormValues>(EMPTY_DYNAMIC_VALUES)
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)

  // Consent / signature (last section)
  const [consentData, setConsentData] = useState({
    consentMedical: false,
    consentActivity: false,
    consentPhoto: false,
    consentTransportation: false,
    consentEmergencyTreatment: false,
    signatureFullName: '',
    signatureInitials: '',
    signatureDate: '',
    certifyAccurate: false,
  })

  const [certFile, setCertFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string | null>(null)

  // Resolve eventId from access code (lazy — only when participantType is first set)
  const [eventId, setEventId] = useState<string | null>(null)

  async function ensureEventId(): Promise<string | null> {
    if (eventId) return eventId
    try {
      const res = await fetch('/api/poros/resolve-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCode }),
      })
      if (!res.ok) return null
      const data = await res.json()
      setEventId(data.eventId)
      if (data.eventName) setEventName(data.eventName)
      return data.eventId
    } catch {
      return null
    }
  }

  const handleBasicChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setBasicData(prev => ({ ...prev, [name]: value }))
  }

  const handleParticipantTypeChange = async (value: string) => {
    setBasicData(prev => ({ ...prev, participantType: value }))
    setFormConfig(null) // Reset so DynamicLiabilityForm refetches config
    await ensureEventId()
  }

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

    const age = parseInt(basicData.age)
    if (age < 18) {
      setError('Age must be 18 or older for this form type')
      return
    }

    if (!basicData.participantType) {
      setError('Please select participant type (Youth 18+ or Chaperone)')
      return
    }

    if (basicData.participantType === 'chaperone' && !dynValues.safeEnvCertOption) {
      setError('Please select a safe environment certificate option')
      return
    }

    if (dynValues.safeEnvCertOption === 'upload_now' && !certFile) {
      setError('Please upload your safe environment certificate')
      return
    }

    const cv = getConsentVisibility(formConfig)
    if (cv.showMedicalRelease && !consentData.consentMedical) {
      setError('Medical treatment consent is required')
      return
    }
    if (!consentData.consentActivity) {
      setError('Activity participation consent is required')
      return
    }
    if (cv.showPhotoConsent && !consentData.consentPhoto) {
      setError('Photo & media release consent is required')
      return
    }
    if (cv.showTransportationConsent && !consentData.consentTransportation) {
      setError('Transportation consent is required')
      return
    }
    if (cv.showEmergencyTreatment && !consentData.consentEmergencyTreatment) {
      setError('Emergency treatment authorization is required')
      return
    }

    if (!consentData.certifyAccurate) {
      setError('You must certify that the information is accurate')
      return
    }

    const nameParts = consentData.signatureFullName.trim().split(' ')
    if (nameParts.length < 2) {
      setError('Please enter your full legal name (first and last name)')
      return
    }
    const expectedInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    if (consentData.signatureInitials.toUpperCase() !== expectedInitials) {
      setError(`Initials should be ${expectedInitials} based on your name`)
      return
    }

    setLoading(true)

    try {
      // Convert cert file to base64 if present
      let certificateFileData = null
      if (certFile) {
        const reader = new FileReader()
        certificateFileData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(certFile)
        })
      }

      const response = await fetch('/api/liability/youth-o18-chaperone/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: accessCode,
          first_name: basicData.firstName,
          last_name: basicData.lastName,
          preferred_name: basicData.preferredName || null,
          date_of_birth: basicData.dateOfBirth,
          age: parseInt(basicData.age),
          gender: basicData.gender,
          email: basicData.email,
          phone: basicData.phone,
          participant_type: basicData.participantType,
          t_shirt_size: basicData.tShirtSize,
          medical_conditions: dynValues.medicalConditions || null,
          medications: dynValues.medications || null,
          allergies: dynValues.allergies || null,
          dietary_restrictions: dynValues.dietaryRestrictions || null,
          ada_accommodations: dynValues.adaAccommodations || null,
          emergency_contact_1_name: dynValues.emergencyContact1Name,
          emergency_contact_1_phone: dynValues.emergencyContact1Phone,
          emergency_contact_1_relation: dynValues.emergencyContact1Relation,
          emergency_contact_2_name: dynValues.emergencyContact2Name || null,
          emergency_contact_2_phone: dynValues.emergencyContact2Phone || null,
          emergency_contact_2_relation: dynValues.emergencyContact2Relation || null,
          insurance_provider: dynValues.insuranceProvider,
          insurance_policy_number: dynValues.insurancePolicyNumber,
          insurance_group_number: dynValues.insuranceGroupNumber || null,
          safe_env_cert_file: certificateFileData,
          safe_env_cert_filename: certFile?.name || null,
          safe_env_cert_program: dynValues.safeEnvCertProgram || null,
          safe_env_cert_completion_date: dynValues.safeEnvCertCompletionDate || null,
          safe_env_cert_expiration_date: dynValues.safeEnvCertExpirationDate || null,
          safe_env_cert_upload_later: dynValues.safeEnvCertOption === 'upload_later',
          signature_full_name: consentData.signatureFullName,
          signature_initials: consentData.signatureInitials,
          signature_date: consentData.signatureDate,
          certify_accurate: consentData.certifyAccurate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      if (data.form_id) setSubmittedFormId(data.form_id)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
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

        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-navy mb-2">Thank You!</h1>
            {eventName && (
              <p className="text-base text-gold font-semibold mb-4">{eventName}</p>
            )}
            <p className="text-gray-700 mb-4">
              Your liability form has been submitted successfully.
            </p>
            <p className="text-gray-600 mb-6">
              A confirmation email has been sent to {basicData.email}.
            </p>
            {submittedFormId && (
              <a
                href={`/api/liability/forms/${submittedFormId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy/90 transition-colors mb-6"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Your Copy (PDF)
              </a>
            )}
            <div>
              <button
                onClick={() => router.push(`/poros/${accessCode}`)}
                className="bg-gray-100 text-navy px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Back to Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const cv = getConsentVisibility(formConfig)
  const sectionNum = formConfig
    ? formConfig.sections.filter(
        s => !['basic_info', 'consent_signature'].includes(s.sectionKey) && s.enabled
      ).length + 2
    : '—'

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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          {eventName && (
            <p className="text-sm font-semibold text-gold uppercase tracking-wide mb-2">{eventName}</p>
          )}
          <h1 className="text-3xl font-bold text-navy mb-2">Youth 18+ / Chaperone Liability Form</h1>
          <p className="text-gray-600">Please complete all sections below</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              1. Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={basicData.firstName}
                  onChange={handleBasicChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={basicData.lastName}
                  onChange={handleBasicChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferredName"
                  value={basicData.preferredName}
                  onChange={handleBasicChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={basicData.dateOfBirth}
                  onChange={handleBasicChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={basicData.age}
                  onChange={handleBasicChange}
                  required
                  min="18"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={basicData.gender}
                  onChange={handleBasicChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={basicData.email}
                  onChange={handleBasicChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={basicData.phone}
                  onChange={handleBasicChange}
                  required
                  placeholder="(XXX) XXX-XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  T-Shirt Size <span className="text-red-500">*</span>
                </label>
                <select
                  name="tShirtSize"
                  value={basicData.tShirtSize}
                  onChange={handleBasicChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="S">Small</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                  <option value="XL">X-Large</option>
                  <option value="2XL">2X-Large</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Participant Type <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="participantType"
                    value="youth_o18"
                    checked={basicData.participantType === 'youth_o18'}
                    onChange={() => handleParticipantTypeChange('youth_o18')}
                    required
                    className="mr-2"
                  />
                  <span>Youth (18+)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="participantType"
                    value="chaperone"
                    checked={basicData.participantType === 'chaperone'}
                    onChange={() => handleParticipantTypeChange('chaperone')}
                    required
                    className="mr-2"
                  />
                  <span>Chaperone</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTIONS 2+: Dynamic sections rendered by DynamicLiabilityForm */}
          {basicData.participantType && eventId && (
            <DynamicLiabilityForm
              eventId={eventId}
              participantType={basicData.participantType}
              sectionOffset={2}
              values={dynValues}
              onChange={handleDynChange}
              certFile={certFile}
              onCertFileChange={setCertFile}
              onConfigLoaded={setFormConfig}
            />
          )}

          {/* Prompt to select participant type if not yet chosen */}
          {!basicData.participantType && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700 text-sm">
              Please select your participant type above to continue.
            </div>
          )}

          {/* LAST SECTION: E-Signature & Consent */}
          {basicData.participantType && eventId && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
                {sectionNum}. E-Signature &amp; Consent
              </h2>

              <div className="space-y-4 mb-6">
                {cv.showMedicalRelease && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentMedical"
                      checked={consentData.consentMedical}
                      onChange={handleConsentChange}
                      required
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="font-semibold">Medical Treatment Consent</span>
                      <p className="text-sm text-gray-600">
                        I authorize event staff to obtain necessary medical treatment in case of emergency
                      </p>
                    </div>
                  </label>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="consentActivity"
                    checked={consentData.consentActivity}
                    onChange={handleConsentChange}
                    required
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-semibold">Activity Participation &amp; Liability Waiver</span>
                    <p className="text-sm text-gray-600">
                      I understand the risks and release the organization from liability
                    </p>
                  </div>
                </label>

                {cv.showPhotoConsent && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentPhoto"
                      checked={consentData.consentPhoto}
                      onChange={handleConsentChange}
                      required
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="font-semibold">Photo &amp; Media Release</span>
                      <p className="text-sm text-gray-600">
                        I consent to use of photos/videos for promotional purposes
                      </p>
                    </div>
                  </label>
                )}

                {cv.showTransportationConsent && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentTransportation"
                      checked={consentData.consentTransportation}
                      onChange={handleConsentChange}
                      required
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="font-semibold">Transportation Authorization</span>
                      <p className="text-sm text-gray-600">
                        I authorize transportation to/from event activities
                      </p>
                    </div>
                  </label>
                )}

                {cv.showEmergencyTreatment && (
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentEmergencyTreatment"
                      checked={consentData.consentEmergencyTreatment}
                      onChange={handleConsentChange}
                      required
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="font-semibold">Emergency Treatment Authorization</span>
                      <p className="text-sm text-gray-600">
                        I authorize event staff to consent to emergency medical treatment on my behalf if I cannot be reached
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="signatureFullName"
                      value={consentData.signatureFullName}
                      onChange={handleConsentChange}
                      required
                      placeholder="Type your full legal name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Initials <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="signatureInitials"
                      value={consentData.signatureInitials}
                      onChange={handleConsentChange}
                      required
                      maxLength={3}
                      placeholder="e.g., JD"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="signatureDate"
                      value={consentData.signatureDate}
                      onChange={handleConsentChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                </div>

                <label className="flex items-start mb-6">
                  <input
                    type="checkbox"
                    name="certifyAccurate"
                    checked={consentData.certifyAccurate}
                    onChange={handleConsentChange}
                    required
                    className="mr-3 mt-1"
                  />
                  <span className="font-semibold">
                    I certify that all information provided is accurate and complete
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
                  className="w-full bg-navy text-white py-4 rounded-lg font-bold text-lg hover:bg-navy/90 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Submitting...' : 'Sign and Submit Form'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
