'use client'

import { useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import DynamicLiabilityForm, {
  EMPTY_DYNAMIC_VALUES,
  getConsentVisibility,
  type DynamicFormValues,
  type FormConfig,
} from '@/components/poros/DynamicLiabilityForm'

const PARTICIPANT_TYPES = [
  { value: 'youth_u18', label: 'Youth Under 18', color: 'bg-blue-100 text-blue-800' },
  { value: 'youth_o18', label: 'Youth 18+', color: 'bg-green-100 text-green-800' },
  { value: 'chaperone', label: 'Chaperone', color: 'bg-teal-100 text-teal-800' },
  { value: 'priest', label: 'Priest', color: 'bg-purple-100 text-purple-800' },
  { value: 'deacon', label: 'Deacon', color: 'bg-purple-100 text-purple-800' },
  { value: 'seminarian', label: 'Seminarian', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'religious_sister', label: 'Religious Sister', color: 'bg-pink-100 text-pink-800' },
  { value: 'religious_brother', label: 'Religious Brother', color: 'bg-orange-100 text-orange-800' },
]

export default function PreviewFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string

  const initialType = searchParams.get('type') ?? 'youth_u18'
  const [participantType, setParticipantType] = useState(initialType)
  const [dynValues, setDynValues] = useState<DynamicFormValues>(EMPTY_DYNAMIC_VALUES)
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)

  const handleDynChange = useCallback((key: string, value: string | boolean) => {
    setDynValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTypeChange = (type: string) => {
    setParticipantType(type)
    setDynValues(EMPTY_DYNAMIC_VALUES)
    setFormConfig(null)
  }

  const cv = getConsentVisibility(formConfig)
  const typeInfo = PARTICIPANT_TYPES.find(t => t.value === participantType)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin preview banner */}
      <div className="bg-amber-400 text-amber-900 text-center py-2 px-4 text-sm font-semibold sticky top-0 z-50 shadow">
        ADMIN PREVIEW — This is how participants see the form. No data will be saved.
      </div>

      <div className="bg-navy py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-center">
          <Image
            src="/Poros logo.png"
            alt="Poros - ChiRho Events"
            width={300}
            height={90}
            className="h-14 w-auto"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Participant type switcher */}
        <div className="bg-white rounded-lg shadow-md p-5 mb-6 border-2 border-amber-300">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            Preview as participant type:
          </p>
          <div className="flex flex-wrap gap-2">
            {PARTICIPANT_TYPES.map(pt => (
              <button
                key={pt.value}
                onClick={() => handleTypeChange(pt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                  participantType === pt.value
                    ? `${pt.color} border-current`
                    : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Showing form for: <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${typeInfo?.color}`}>{typeInfo?.label}</span>
          </p>
        </div>

        {/* Simulated basic info section (section 1 — always present) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 opacity-60">
          <h2 className="text-xl font-bold text-navy mb-1 pb-2 border-b-2 border-gold">
            1. Basic Information
          </h2>
          <p className="text-sm text-gray-500 italic mt-3">
            (Name, date of birth, contact info — filled by participant)
          </p>
        </div>

        {/* Dynamic sections driven by real form config */}
        <DynamicLiabilityForm
          eventId={eventId}
          participantType={participantType}
          sectionOffset={2}
          values={dynValues}
          onChange={handleDynChange}
          onConfigLoaded={setFormConfig}
        />

        {/* Consent & signature section (always last) */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
            E-Signature &amp; Consent
          </h2>
          <div className="space-y-3 mb-6">
            {cv.showMedicalRelease && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <input type="checkbox" disabled className="mt-1 h-4 w-4" />
                <span className="text-sm text-gray-700">
                  <strong>Medical Release:</strong>{' '}
                  {formConfig?.sections.find(s => s.sectionKey === 'medical_release')?.waiverText
                    ?? 'Medical release text (set in Waiver Templates)'}
                </span>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              <input type="checkbox" disabled className="mt-1 h-4 w-4" />
              <span className="text-sm text-gray-700">
                <strong>Activity Waiver:</strong>{' '}
                {formConfig?.generalWaiverText ?? 'General waiver text (set in Waiver Templates)'}
              </span>
            </div>
            {cv.showPhotoConsent && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <input type="checkbox" disabled className="mt-1 h-4 w-4" />
                <span className="text-sm text-gray-700">
                  <strong>Photo &amp; Video Consent:</strong>{' '}
                  {formConfig?.sections.find(s => s.sectionKey === 'photo_video_consent')?.waiverText
                    ?? 'Photo consent text (set in Waiver Templates)'}
                </span>
              </div>
            )}
            {cv.showTransportationConsent && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <input type="checkbox" disabled className="mt-1 h-4 w-4" />
                <span className="text-sm text-gray-700">
                  <strong>Transportation Consent:</strong>{' '}
                  {formConfig?.sections.find(s => s.sectionKey === 'transportation_consent')?.waiverText
                    ?? 'Transportation consent text (set in Waiver Templates)'}
                </span>
              </div>
            )}
            {cv.showEmergencyTreatment && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <input type="checkbox" disabled className="mt-1 h-4 w-4" />
                <span className="text-sm text-gray-700">
                  <strong>Emergency Treatment Authorization:</strong>{' '}
                  {formConfig?.sections.find(s => s.sectionKey === 'emergency_treatment')?.waiverText
                    ?? 'Emergency treatment authorization text (set in Waiver Templates)'}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 opacity-50">
            {participantType === 'youth_u18' ? (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Full Legal Name</label>
                  <input disabled placeholder="Type parent/guardian full legal name" className="w-full border rounded px-3 py-2 bg-gray-50 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Participant&apos;s Full Name</label>
                  <input disabled placeholder="Participant first and last name" className="w-full border rounded px-3 py-2 bg-gray-50 text-sm" />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Legal Name</label>
                <input disabled placeholder="Type full name to sign" className="w-full border rounded px-3 py-2 bg-gray-50 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initials</label>
              <input disabled placeholder="FL" maxLength={2} className="w-full border rounded px-3 py-2 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input disabled placeholder={new Date().toLocaleDateString()} className="w-full border rounded px-3 py-2 bg-gray-50 text-sm" />
            </div>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
            Submit button is disabled in preview mode — no data will be saved.
          </div>
        </div>
      </div>
    </div>
  )
}
