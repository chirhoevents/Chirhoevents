'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  DynamicLiabilityForm,
  EMPTY_DYNAMIC_VALUES,
  getConsentVisibility,
  type DynamicFormValues,
  type FormConfig,
} from '@/components/poros/DynamicLiabilityForm'

// Maps the selected clergy/religious title to the participant_type that drives
// section config lookups. This ensures sisters/brothers get a different section
// layout from priests without requiring a separate form page.
function titleToParticipantType(title: string): string {
  switch (title) {
    case 'father':
    case 'most_reverend':
      return 'priest'
    case 'deacon':
      return 'deacon'
    case 'seminarian':
    case 'mr':
      return 'seminarian'
    case 'sister':
      return 'religious_sister'
    case 'brother':
      return 'religious_brother'
    default:
      return 'priest'
  }
}

// Returns a friendly success greeting based on title
function successGreeting(title: string): string {
  switch (title) {
    case 'father':
    case 'most_reverend':
      return 'Thank You, Father!'
    case 'deacon':
      return 'Thank You, Deacon!'
    case 'seminarian':
    case 'mr':
      return 'Thank You!'
    case 'sister':
      return 'Thank You, Sister!'
    case 'brother':
      return 'Thank You, Brother!'
    default:
      return 'Thank You!'
  }
}

export default function ClergyForm() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  // ── Basic info (section 1, always shown) ────────────────────────────────────
  const [basicData, setBasicData] = useState({
    clergyTitle: '',
    firstName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    age: '',
    email: '',
    phone: '',
    tShirtSize: '',
  })

  // ── Dynamic section values (sections 2-N rendered by DynamicLiabilityForm) ──
  const [dynValues, setDynValues] = useState<DynamicFormValues>(EMPTY_DYNAMIC_VALUES)

  // ── Consent section (rendered here, visibility driven by config) ────────────
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

  // ── Files ────────────────────────────────────────────────────────────────────
  const [certFile, setCertFile] = useState<File | null>(null)
  const [logsFile, setLogsFile] = useState<File | null>(null)

  // ── Config state ─────────────────────────────────────────────────────────────
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string | null>(null)

  const participantType = titleToParticipantType(basicData.clergyTitle)

  // We need the eventId to pass to DynamicLiabilityForm. Resolve it once by
  // looking up the access code. For simplicity we store it after first load.
  const [eventId, setEventId] = useState<string | null>(null)

  const handleConfigLoaded = useCallback((cfg: FormConfig) => {
    setFormConfig(cfg)
    setEventId(cfg.eventId)
  }, [])

  // Resolve eventId from access code the first time the title is set
  const [eventIdResolved, setEventIdResolved] = useState(false)
  const ensureEventId = useCallback(async () => {
    if (eventIdResolved || eventId) return
    try {
      const res = await fetch('/api/poros/resolve-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCode }),
      })
      if (res.ok) {
        const data = await res.json()
        setEventId(data.eventId)
        if (data.eventName) setEventName(data.eventName)
      }
    } catch {
      // If this fails, DynamicLiabilityForm handles it gracefully
    } finally {
      setEventIdResolved(true)
    }
  }, [accessCode, eventId, eventIdResolved])

  const handleTitleChange = (title: string) => {
    setBasicData((prev) => ({ ...prev, clergyTitle: title }))
    // Reset config so it refetches for the new participant type
    setFormConfig(null)
    ensureEventId()
  }

  const dynonChange = (key: string, val: string | boolean) =>
    setDynValues((prev) => ({ ...prev, [key]: val }))

  const consentChange = (key: string, val: string | boolean) =>
    setConsentData((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // ── Validation ────────────────────────────────────────────────────────────
    const age = parseInt(basicData.age)
    if (isNaN(age) || age < 18) {
      setError('Age must be 18 or older')
      return
    }

    if (!basicData.clergyTitle) {
      setError('Please select a title')
      return
    }

    const consent = getConsentVisibility(formConfig)
    const missingConsent =
      (consent.showMedicalRelease && !consentData.consentMedical) ||
      !consentData.consentActivity ||
      (consent.showPhotoConsent && !consentData.consentPhoto) ||
      (consent.showTransportationConsent && !consentData.consentTransportation) ||
      (consent.showEmergencyTreatment && !consentData.consentEmergencyTreatment)

    if (missingConsent) {
      setError('All required consent checkboxes must be checked')
      return
    }
    if (!consentData.certifyAccurate) {
      setError('You must certify that the information is accurate')
      return
    }

    const nameParts = consentData.signatureFullName.trim().split(' ')
    if (nameParts.length < 2) {
      setError('Please enter your full legal name (first and last)')
      return
    }
    const expected = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    if (consentData.signatureInitials.toUpperCase() !== expected) {
      setError(`Initials should be ${expected} based on your name`)
      return
    }

    setLoading(true)

    try {
      // ── Submit main form ────────────────────────────────────────────────────
      const response = await fetch('/api/liability/clergy/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: accessCode,
          clergy_title: basicData.clergyTitle,
          participant_type: participantType,
          first_name: basicData.firstName,
          last_name: basicData.lastName,
          preferred_name: basicData.preferredName || null,
          date_of_birth: basicData.dateOfBirth,
          age,
          email: basicData.email,
          phone: basicData.phone,
          t_shirt_size: basicData.tShirtSize,
          diocese_of_incardination: dynValues.dioceseOfIncardination || null,
          current_assignment: dynValues.currentAssignment || null,
          faculty_information: dynValues.facultyInformation || null,
          needs_housing: dynValues.needsHousing,
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
          signature_full_name: consentData.signatureFullName,
          signature_initials: consentData.signatureInitials,
          signature_date: consentData.signatureDate,
          certify_accurate: consentData.certifyAccurate,
          consent_medical: consentData.consentMedical,
          consent_activity: consentData.consentActivity,
          consent_photo: consentData.consentPhoto,
          consent_transportation: consentData.consentTransportation,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit form')

      const liabilityFormId: string | undefined = data.liabilityFormId
      if (data.form_id) setSubmittedFormId(data.form_id)

      // ── Submit letter of good standing (if collected) ───────────────────────
      if (dynValues.logsMethod && (logsFile || dynValues.logsMethod === 'external_submission')) {
        const logsForm = new FormData()
        logsForm.set('access_code', accessCode)
        logsForm.set('submission_method', dynValues.logsMethod)
        logsForm.set('participant_type', participantType)
        if (liabilityFormId) logsForm.set('liability_form_id', liabilityFormId)
        if (logsFile) logsForm.set('file', logsFile)
        if (dynValues.logsExternalNotes) logsForm.set('external_notes', dynValues.logsExternalNotes)

        await fetch('/api/poros/letters-of-good-standing', {
          method: 'POST',
          body: logsForm,
        }).catch(() => {}) // Non-fatal — admin can chase this up
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setLoading(false)
    }
  }

  const consent = getConsentVisibility(formConfig)
  const titleLabel =
    basicData.clergyTitle === 'sister' || basicData.clergyTitle === 'brother'
      ? 'Clergy / Religious Information'
      : 'Clergy Information'

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-navy py-6 shadow-md">
          <div className="container mx-auto px-4 flex justify-center">
            <Image src="/Poros logo.png" alt="Poros" width={350} height={105} className="h-16 md:h-20 w-auto" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-navy mb-2">
              {successGreeting(basicData.clergyTitle)}
            </h1>
            {eventName && (
              <p className="text-base text-gold font-semibold mb-4">{eventName}</p>
            )}
            <p className="text-gray-700 mb-4">Your liability form has been submitted successfully.</p>
            {basicData.email && (
              <p className="text-gray-600 mb-6">
                A confirmation has been sent to <strong>{basicData.email}</strong>.
              </p>
            )}
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

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy py-6 shadow-md">
        <div className="container mx-auto px-4 flex justify-center">
          <Image src="/Poros logo.png" alt="Poros" width={350} height={105} className="h-16 md:h-20 w-auto" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          {eventName && (
            <p className="text-sm font-semibold text-gold uppercase tracking-wide mb-2">{eventName}</p>
          )}
          <h1 className="text-3xl font-bold text-navy mb-2">Clergy, Seminarians &amp; Religious Liability Form</h1>
          <p className="text-gray-600">For Priests, Deacons, Seminarians, Sisters, Brothers, and Religious</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── SECTION 1: Basic Information ─────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              1. Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <select
                  value={basicData.clergyTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                >
                  <option value="">Select…</option>
                  <option value="father">Father</option>
                  <option value="most_reverend">Most Reverend (Bishop)</option>
                  <option value="deacon">Deacon</option>
                  <option value="seminarian">Seminarian</option>
                  <option value="sister">Sister</option>
                  <option value="brother">Brother</option>
                  <option value="mr">Mr.</option>
                </select>
              </div>

              {(['firstName', 'lastName'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {field === 'firstName' ? 'First Name' : 'Last Name'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={basicData[field]}
                    onChange={(e) => setBasicData((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Name</label>
                <input
                  type="text"
                  value={basicData.preferredName}
                  onChange={(e) => setBasicData((p) => ({ ...p, preferredName: e.target.value }))}
                  placeholder="e.g., Father John"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={basicData.dateOfBirth}
                  onChange={(e) => setBasicData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="18"
                  value={basicData.age}
                  onChange={(e) => setBasicData((p) => ({ ...p, age: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={basicData.email}
                  onChange={(e) => setBasicData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(XXX) XXX-XXXX"
                  value={basicData.phone}
                  onChange={(e) => setBasicData((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  T-Shirt Size <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={basicData.tShirtSize}
                  onChange={(e) => setBasicData((p) => ({ ...p, tShirtSize: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                >
                  <option value="">Select…</option>
                  <option value="S">Small</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                  <option value="XL">X-Large</option>
                  <option value="2XL">2X-Large</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Dynamic sections (2 onward) driven by per-event config ────────── */}
          {basicData.clergyTitle && eventId ? (
            <DynamicLiabilityForm
              eventId={eventId}
              participantType={participantType}
              sectionOffset={2}
              values={dynValues}
              onChange={dynonChange}
              certFile={certFile}
              onCertFileChange={setCertFile}
              logsFile={logsFile}
              onLogsFileChange={setLogsFile}
              onConfigLoaded={handleConfigLoaded}
            />
          ) : basicData.clergyTitle && !eventId ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Loading form configuration…
            </div>
          ) : null}

          {/* ── Consent & Signature (always last) ─────────────────────────────── */}
          {basicData.clergyTitle && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
                E-Signature &amp; Consent
              </h2>

              <div className="space-y-4 mb-6">
                {consent.showMedicalRelease && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentData.consentMedical}
                      onChange={(e) => consentChange('consentMedical', e.target.checked)}
                      className="mt-1 h-5 w-5"
                    />
                    <div>
                      <span className="font-semibold">Medical Treatment Consent</span>
                      <p className="text-sm text-gray-600">
                        I authorize event staff to obtain necessary medical treatment in case of emergency.
                      </p>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={consentData.consentActivity}
                    onChange={(e) => consentChange('consentActivity', e.target.checked)}
                    className="mt-1 h-5 w-5"
                  />
                  <div>
                    <span className="font-semibold">Activity Participation &amp; Liability Waiver</span>
                    <p className="text-sm text-gray-600">
                      I understand the risks and release the organization from liability.
                    </p>
                  </div>
                </label>

                {consent.showPhotoConsent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentData.consentPhoto}
                      onChange={(e) => consentChange('consentPhoto', e.target.checked)}
                      className="mt-1 h-5 w-5"
                    />
                    <div>
                      <span className="font-semibold">Photo &amp; Media Release</span>
                      <p className="text-sm text-gray-600">
                        I consent to use of photos/videos for promotional purposes.
                      </p>
                    </div>
                  </label>
                )}

                {consent.showTransportationConsent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentData.consentTransportation}
                      onChange={(e) => consentChange('consentTransportation', e.target.checked)}
                      className="mt-1 h-5 w-5"
                    />
                    <div>
                      <span className="font-semibold">Transportation Authorization</span>
                      <p className="text-sm text-gray-600">
                        I authorize transportation to/from event activities.
                      </p>
                    </div>
                  </label>
                )}

                {consent.showEmergencyTreatment && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentData.consentEmergencyTreatment}
                      onChange={(e) => consentChange('consentEmergencyTreatment', e.target.checked)}
                      className="mt-1 h-5 w-5"
                    />
                    <div>
                      <span className="font-semibold">Emergency Treatment Authorization</span>
                      <p className="text-sm text-gray-600">
                        I authorize event staff to consent to emergency medical treatment on my behalf if I cannot be reached.
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
                      required
                      placeholder="Type your full legal name"
                      value={consentData.signatureFullName}
                      onChange={(e) => consentChange('signatureFullName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Initials <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      placeholder="e.g., JD"
                      value={consentData.signatureInitials}
                      onChange={(e) =>
                        consentChange('signatureInitials', e.target.value.toUpperCase())
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={consentData.signatureDate}
                      onChange={(e) => consentChange('signatureDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={consentData.certifyAccurate}
                    onChange={(e) => consentChange('certifyAccurate', e.target.checked)}
                    className="mt-1 h-5 w-5"
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
                  and consent to collection and use of the information provided.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-navy text-white py-4 rounded-lg font-bold text-lg hover:bg-navy/90 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Submitting…' : 'Sign and Submit Form'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
