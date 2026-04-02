'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LetterConfig {
  method: string // 'file_upload' | 'instructions_only' | 'both'
  contactName: string | null
  contactEmail: string | null
  instructions: string | null
}

export interface Section {
  sectionKey: string
  enabled: boolean
  required: boolean
  displayOrder: number
  label: string
  helpText: string | null
  waiverText?: string | null
  letterConfig?: LetterConfig
}

export interface CustomField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio'
  required?: boolean
  options?: string[]
  placeholder?: string
}

export interface CustomSection {
  key: string
  label: string
  helpText?: string
  fields: CustomField[]
}

export interface FormConfig {
  eventId: string
  participantType: string
  formType: string
  generalWaiverText: string | null
  sections: Section[]
  customSections: CustomSection[]
  customQuestions: CustomField[]
}

// Flat values bag — parent owns state, this component is pure controlled
export interface DynamicFormValues {
  // Medical
  medicalConditions: string
  medications: string
  allergies: string
  dietaryRestrictions: string
  adaAccommodations: string
  // Emergency contacts
  emergencyContact1Name: string
  emergencyContact1Phone: string
  emergencyContact1Relation: string
  emergencyContact2Name: string
  emergencyContact2Phone: string
  emergencyContact2Relation: string
  // Insurance
  insuranceProvider: string
  insurancePolicyNumber: string
  insuranceGroupNumber: string
  // Clergy/religious info
  dioceseOfIncardination: string
  currentAssignment: string
  facultyInformation: string
  needsHousing: boolean
  // Safe environment cert
  safeEnvCertOption: string // 'upload_now' | 'upload_later'
  safeEnvCertProgram: string
  safeEnvCertCompletionDate: string
  safeEnvCertExpirationDate: string
  // Letter of good standing
  logsMethod: string // 'file_upload' | 'external_submission'
  logsExternalNotes: string
  logsSubmittedToContact: string
  logsSubmittedToEmail: string
  // Custom field values — keyed by field.key
  [key: string]: string | boolean
}

export const EMPTY_DYNAMIC_VALUES: DynamicFormValues = {
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
  dioceseOfIncardination: '',
  currentAssignment: '',
  facultyInformation: '',
  needsHousing: false,
  safeEnvCertOption: '',
  safeEnvCertProgram: '',
  safeEnvCertCompletionDate: '',
  safeEnvCertExpirationDate: '',
  logsMethod: '',
  logsExternalNotes: '',
  logsSubmittedToContact: '',
  logsSubmittedToEmail: '',
}

interface Props {
  eventId: string
  participantType: string
  /** Starting section number (1-based). Pass 2 when parent renders basic_info as §1. */
  sectionOffset?: number
  /** Controlled values — parent owns state */
  values: DynamicFormValues
  onChange: (key: string, value: string | boolean) => void
  /** Safe-environment-cert file upload */
  certFile?: File | null
  onCertFileChange?: (file: File | null) => void
  /** Letter-of-good-standing file */
  logsFile?: File | null
  onLogsFileChange?: (file: File | null) => void
  /** Called once config is fetched — parent can read which consent sections are on */
  onConfigLoaded?: (config: FormConfig) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent'
const TEXTAREA = INPUT

function SectionCard({
  number,
  label,
  helpText,
  children,
}: {
  number: number
  label: string
  helpText?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-navy mb-1 pb-2 border-b-2 border-gold">
        {number}. {label}
      </h2>
      {helpText && <p className="text-sm text-gray-600 mb-4">{helpText}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// ─── Dynamic custom field renderer ───────────────────────────────────────────

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField
  value: string | boolean
  onChange: (key: string, val: string | boolean) => void
}) {
  const id = `custom_${field.key}`

  switch (field.type) {
    case 'textarea':
      return (
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            id={id}
            rows={3}
            required={field.required}
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={TEXTAREA}
          />
        </div>
      )
    case 'select':
      return (
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            id={id}
            required={field.required}
            value={value as string}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={INPUT}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )
    case 'checkbox':
      return (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            id={id}
            required={field.required}
            checked={value as boolean}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-navy"
          />
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
        </label>
      )
    case 'radio':
      return (
        <fieldset>
          <legend className="block text-sm font-semibold text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </legend>
          <div className="space-y-2">
            {(field.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={id}
                  value={opt}
                  required={field.required}
                  checked={(value as string) === opt}
                  onChange={() => onChange(field.key, opt)}
                  className="h-4 w-4 text-navy"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )
    default: // text
      return (
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            id={id}
            required={field.required}
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={INPUT}
          />
        </div>
      )
  }
}

// ─── Section renderers ────────────────────────────────────────────────────────

function MedicalSection({
  section,
  num,
  values,
  onChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
}) {
  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Medical Conditions
          </label>
          <textarea
            rows={3}
            value={values.medicalConditions}
            onChange={(e) => onChange('medicalConditions', e.target.value)}
            placeholder="List any medical conditions we should be aware of"
            className={TEXTAREA}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Medications
          </label>
          <textarea
            rows={3}
            value={values.medications}
            onChange={(e) => onChange('medications', e.target.value)}
            placeholder="List all medications currently being taken"
            className={TEXTAREA}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="inline-flex items-center gap-2">
              Allergies
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                IMPORTANT
              </span>
            </span>
          </label>
          <textarea
            rows={3}
            value={values.allergies}
            onChange={(e) => onChange('allergies', e.target.value)}
            placeholder="List any allergies (food, medication, environmental, etc.)"
            className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Dietary Restrictions
          </label>
          <textarea
            rows={2}
            value={values.dietaryRestrictions}
            onChange={(e) => onChange('dietaryRestrictions', e.target.value)}
            placeholder="Any dietary restrictions or preferences"
            className={TEXTAREA}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ADA Accommodations Needed
          </label>
          <textarea
            rows={2}
            value={values.adaAccommodations}
            onChange={(e) => onChange('adaAccommodations', e.target.value)}
            placeholder="Any accessibility accommodations needed"
            className={TEXTAREA}
          />
        </div>
      </div>
    </SectionCard>
  )
}

function EmergencyContactsSection({
  section,
  num,
  values,
  onChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
}) {
  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-navy mb-3">
            Primary Emergency Contact{section.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={values.emergencyContact1Name}
                onChange={(e) => onChange('emergencyContact1Name', e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={values.emergencyContact1Phone}
                onChange={(e) => onChange('emergencyContact1Phone', e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Relationship <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Parent, Spouse"
                value={values.emergencyContact1Relation}
                onChange={(e) => onChange('emergencyContact1Relation', e.target.value)}
                className={INPUT}
              />
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-navy mb-3">Secondary Emergency Contact (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={values.emergencyContact2Name}
                onChange={(e) => onChange('emergencyContact2Name', e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={values.emergencyContact2Phone}
                onChange={(e) => onChange('emergencyContact2Phone', e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
              <input
                type="text"
                value={values.emergencyContact2Relation}
                onChange={(e) => onChange('emergencyContact2Relation', e.target.value)}
                className={INPUT}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

function InsuranceSection({
  section,
  num,
  values,
  onChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
}) {
  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Insurance Provider <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required={section.required}
            placeholder="e.g., Blue Cross Blue Shield"
            value={values.insuranceProvider}
            onChange={(e) => onChange('insuranceProvider', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Policy Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required={section.required}
            value={values.insurancePolicyNumber}
            onChange={(e) => onChange('insurancePolicyNumber', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Group Number</label>
          <input
            type="text"
            value={values.insuranceGroupNumber}
            onChange={(e) => onChange('insuranceGroupNumber', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
    </SectionCard>
  )
}

function ClergyInfoSection({
  section,
  num,
  values,
  onChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
}) {
  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Diocese / Religious Community <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required={section.required}
            placeholder="e.g., Diocese of Oklahoma City, Order of St. Benedict"
            value={values.dioceseOfIncardination}
            onChange={(e) => onChange('dioceseOfIncardination', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Assignment
          </label>
          <input
            type="text"
            placeholder="e.g., Pastor, St. Mary's Parish"
            value={values.currentAssignment}
            onChange={(e) => onChange('currentAssignment', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Faculty Information
          </label>
          <textarea
            rows={3}
            placeholder="Do you have faculties to hear confessions in this state/diocese?"
            value={values.facultyInformation}
            onChange={(e) => onChange('facultyInformation', e.target.value)}
            className={TEXTAREA}
          />
        </div>
      </div>
    </SectionCard>
  )
}

function HousingSection({
  section,
  num,
  values,
  onChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
}) {
  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={values.needsHousing as boolean}
          onChange={(e) => onChange('needsHousing', e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-navy"
        />
        <div>
          <span className="font-semibold text-gray-700">I need housing accommodations</span>
          <p className="text-sm text-gray-600 mt-1">
            Check this box if you require housing for this event.
          </p>
        </div>
      </label>
    </SectionCard>
  )
}

function SafeEnvCertSection({
  section,
  num,
  values,
  onChange,
  certFile,
  onCertFileChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
  certFile?: File | null
  onCertFileChange?: (f: File | null) => void
}) {
  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-blue-50 transition-colors border-gray-200">
            <input
              type="radio"
              name="safeEnvCertOption"
              value="upload_now"
              required={section.required}
              checked={values.safeEnvCertOption === 'upload_now'}
              onChange={() => onChange('safeEnvCertOption', 'upload_now')}
              className="mt-1 h-4 w-4 text-navy"
            />
            <div>
              <span className="font-semibold text-gray-700">Upload certificate now</span>
              <p className="text-sm text-gray-600">Submit your Safe Environment certificate with this form</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-blue-50 transition-colors border-gray-200">
            <input
              type="radio"
              name="safeEnvCertOption"
              value="upload_later"
              checked={values.safeEnvCertOption === 'upload_later'}
              onChange={() => onChange('safeEnvCertOption', 'upload_later')}
              className="mt-1 h-4 w-4 text-navy"
            />
            <div>
              <span className="font-semibold text-gray-700">I will submit it later</span>
              <p className="text-sm text-gray-600">You can email your certificate after submitting this form</p>
            </div>
          </label>
        </div>

        {values.safeEnvCertOption === 'upload_now' && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Certificate File (PDF) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf"
                required
                onChange={(e) => onCertFileChange?.(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-navy/90"
              />
              {certFile && (
                <p className="text-xs text-green-700 mt-1">Selected: {certFile.name}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Program Name
                </label>
                <input
                  type="text"
                  value={values.safeEnvCertProgram}
                  onChange={(e) => onChange('safeEnvCertProgram', e.target.value)}
                  placeholder="e.g., Virtus Online"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Completion Date
                </label>
                <input
                  type="date"
                  value={values.safeEnvCertCompletionDate}
                  onChange={(e) => onChange('safeEnvCertCompletionDate', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={values.safeEnvCertExpirationDate}
                  onChange={(e) => onChange('safeEnvCertExpirationDate', e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function LetterOfGoodStandingSection({
  section,
  num,
  values,
  onChange,
  logsFile,
  onLogsFileChange,
}: {
  section: Section
  num: number
  values: DynamicFormValues
  onChange: (k: string, v: string | boolean) => void
  logsFile?: File | null
  onLogsFileChange?: (f: File | null) => void
}) {
  const cfg = section.letterConfig
  const showUpload = !cfg || cfg.method === 'file_upload' || cfg.method === 'both'
  const showInstructions = cfg && (cfg.method === 'instructions_only' || cfg.method === 'both')

  return (
    <SectionCard number={num} label={section.label} helpText={section.helpText}>
      <div className="space-y-4">
        {showInstructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {cfg?.instructions && (
              <p className="text-sm text-blue-800 mb-3 whitespace-pre-line">{cfg.instructions}</p>
            )}
            {(cfg?.contactName || cfg?.contactEmail) && (
              <div className="text-sm text-blue-700">
                <span className="font-semibold">Submit to: </span>
                {cfg.contactName && <span>{cfg.contactName}</span>}
                {cfg.contactEmail && (
                  <a
                    href={`mailto:${cfg.contactEmail}`}
                    className="ml-1 underline hover:text-blue-900"
                  >
                    {cfg.contactEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {showUpload && (
          <div className="space-y-3">
            {showInstructions && (
              <p className="text-sm font-semibold text-gray-700">
                You may also upload your letter directly:
              </p>
            )}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-green-50 transition-colors border-gray-200">
                <input
                  type="radio"
                  name="logsMethod"
                  value="file_upload"
                  checked={values.logsMethod === 'file_upload'}
                  onChange={() => onChange('logsMethod', 'file_upload')}
                  required={section.required}
                  className="mt-1 h-4 w-4 text-navy"
                />
                <div>
                  <span className="font-semibold text-gray-700">Upload letter now</span>
                  <p className="text-sm text-gray-600">Attach a PDF or image of your letter</p>
                </div>
              </label>

              {showInstructions && (
                <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-green-50 transition-colors border-gray-200">
                  <input
                    type="radio"
                    name="logsMethod"
                    value="external_submission"
                    checked={values.logsMethod === 'external_submission'}
                    onChange={() => onChange('logsMethod', 'external_submission')}
                    className="mt-1 h-4 w-4 text-navy"
                  />
                  <div>
                    <span className="font-semibold text-gray-700">I will submit externally</span>
                    <p className="text-sm text-gray-600">
                      I have sent / will send the letter to the contact above
                    </p>
                  </div>
                </label>
              )}
            </div>

            {values.logsMethod === 'file_upload' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onLogsFileChange?.(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-navy/90"
                />
                {logsFile && (
                  <p className="text-xs text-green-700 mt-1">Selected: {logsFile.name}</p>
                )}
              </div>
            )}

            {values.logsMethod === 'external_submission' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Submission Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Sent via email on March 15"
                    value={values.logsExternalNotes}
                    onChange={(e) => onChange('logsExternalNotes', e.target.value)}
                    className={TEXTAREA}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!showUpload && !showInstructions && (
          <p className="text-sm text-gray-500 italic">
            Letter of good standing configuration is pending. Please contact the event organizer.
          </p>
        )}
      </div>
    </SectionCard>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DynamicLiabilityForm({
  eventId,
  participantType,
  sectionOffset = 2,
  values,
  onChange,
  certFile,
  onCertFileChange,
  logsFile,
  onLogsFileChange,
  onConfigLoaded,
}: Props) {
  const [config, setConfig] = useState<FormConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    if (!eventId || !participantType) return
    setConfigLoading(true)
    setConfigError(null)
    try {
      const res = await fetch(
        `/api/poros/events/${eventId}/form-config/${participantType}`
      )
      if (!res.ok) throw new Error('Failed to load form configuration')
      const data: FormConfig = await res.json()
      setConfig(data)
      onConfigLoaded?.(data)
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to load form configuration')
    } finally {
      setConfigLoading(false)
    }
  }, [eventId, participantType, onConfigLoaded])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <svg className="animate-spin h-6 w-6 mr-3 text-navy" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading form sections…
      </div>
    )
  }

  if (configError || !config) {
    // Render nothing extra on config error — parent form can still submit with defaults
    return null
  }

  const enabledSections = config.sections
    .filter((s) => s.enabled && s.sectionKey !== 'basic_info')
    .sort((a, b) => a.displayOrder - b.displayOrder)

  // Consent-related section keys — rendered separately by the parent form
  const CONSENT_KEYS = new Set([
    'transportation_consent',
    'photo_video_consent',
    'medical_release',
    'emergency_treatment',
  ])

  // Non-consent body sections (rendered here)
  const bodySections = enabledSections.filter((s) => !CONSENT_KEYS.has(s.sectionKey))

  let sectionNum = sectionOffset

  return (
    <>
      {bodySections.map((section) => {
        const num = sectionNum++
        switch (section.sectionKey) {
          case 'medical':
            return (
              <MedicalSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
              />
            )
          case 'emergency_contacts':
            return (
              <EmergencyContactsSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
              />
            )
          case 'insurance':
            return (
              <InsuranceSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
              />
            )
          case 'clergy_info':
            return (
              <ClergyInfoSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
              />
            )
          case 'housing':
            return (
              <HousingSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
              />
            )
          case 'safe_environment_cert':
            return (
              <SafeEnvCertSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
                certFile={certFile}
                onCertFileChange={onCertFileChange}
              />
            )
          case 'letter_of_good_standing':
            return (
              <LetterOfGoodStandingSection
                key={section.sectionKey}
                section={section}
                num={num}
                values={values}
                onChange={onChange}
                logsFile={logsFile}
                onLogsFileChange={onLogsFileChange}
              />
            )
          default:
            return null
        }
      })}

      {/* Custom sections from the active waiver template */}
      {config.customSections.map((cs) => (
        <SectionCard key={cs.key} number={sectionNum++} label={cs.label} helpText={cs.helpText}>
          <div className="space-y-4">
            {cs.fields.map((field) => (
              <CustomFieldInput
                key={field.key}
                field={field}
                value={values[`custom_${field.key}`] ?? (field.type === 'checkbox' ? false : '')}
                onChange={onChange}
              />
            ))}
          </div>
        </SectionCard>
      ))}

      {/* Flat custom questions (no section grouping) */}
      {config.customQuestions.length > 0 && (
        <SectionCard number={sectionNum++} label="Additional Information" helpText={null}>
          <div className="space-y-4">
            {config.customQuestions.map((field) => (
              <CustomFieldInput
                key={field.key}
                field={field}
                value={values[`custom_${field.key}`] ?? (field.type === 'checkbox' ? false : '')}
                onChange={onChange}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </>
  )
}

/**
 * Returns which consent checkboxes should be shown based on a loaded FormConfig.
 * Call this from a parent that received config via onConfigLoaded.
 */
export function getConsentVisibility(config: FormConfig | null) {
  if (!config) {
    // Default: show all
    return {
      showMedicalRelease: true,
      showPhotoConsent: true,
      showTransportationConsent: true,
      showEmergencyTreatment: true,
    }
  }
  const map = new Map(config.sections.map((s) => [s.sectionKey, s]))
  return {
    showMedicalRelease: map.get('medical_release')?.enabled ?? true,
    showPhotoConsent: map.get('photo_video_consent')?.enabled ?? true,
    showTransportationConsent: map.get('transportation_consent')?.enabled ?? true,
    showEmergencyTreatment: map.get('emergency_treatment')?.enabled ?? true,
  }
}
