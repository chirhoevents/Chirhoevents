'use client'

import React, { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, Download, Loader2, PenLine } from 'lucide-react'

interface ManualEntryTabProps {
  eventId: string
  onUpdate: () => void
}

const FORM_TYPE_OPTIONS = [
  { value: 'youth_u18', label: 'Youth (Under 18)' },
  { value: 'youth_o18_chaperone', label: 'Adult / Chaperone (18+)' },
  { value: 'clergy', label: 'Clergy & Seminarians' },
  { value: 'religious', label: 'Religious (Sisters & Brothers)' },
]

const PARTICIPANT_TYPE_FOR_FORM: Record<string, { value: string; label: string }[]> = {
  youth_u18: [],
  youth_o18_chaperone: [
    { value: 'youth_o18', label: 'Youth (18+)' },
    { value: 'chaperone', label: 'Chaperone' },
  ],
  clergy: [
    { value: 'priest', label: 'Priest' },
    { value: 'deacon', label: 'Deacon' },
    { value: 'seminarian', label: 'Seminarian' },
  ],
  religious: [
    { value: 'religious_sister', label: 'Sister' },
    { value: 'religious_brother', label: 'Brother' },
  ],
}

const initialForm = {
  formType: 'youth_u18',
  participantType: '',
  participantFirstName: '',
  participantLastName: '',
  participantPreferredName: '',
  participantAge: '',
  participantGender: '',
  participantEmail: '',
  participantPhone: '',
  tShirtSize: '',
  // clergy/religious
  clergyTitle: '',
  dioceseOfIncardination: '',
  currentAssignment: '',
  facultyInformation: '',
  needsHousing: '',
  // medical
  medicalConditions: '',
  medications: '',
  allergies: '',
  dietaryRestrictions: '',
  adaAccommodations: '',
  // emergency contacts
  emergencyContact1Name: '',
  emergencyContact1Phone: '',
  emergencyContact1Relation: '',
  emergencyContact2Name: '',
  emergencyContact2Phone: '',
  emergencyContact2Relation: '',
  // insurance
  insuranceProvider: '',
  insurancePolicyNumber: '',
  insuranceGroupNumber: '',
  // signature
  signerFullLegalName: '',
  dateSigned: new Date().toISOString().split('T')[0],
}

export function ManualEntryTab({ eventId, onUpdate }: ManualEntryTabProps) {
  const { getToken } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [createdFormId, setCreatedFormId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isClergy = form.formType === 'clergy'
  const isReligious = form.formType === 'religious'
  const isAdult = form.formType === 'youth_o18_chaperone'
  const isYouth = form.formType === 'youth_u18'
  const hasParticipantTypeSelect = PARTICIPANT_TYPE_FOR_FORM[form.formType]?.length > 0

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.participantFirstName.trim() || !form.participantLastName.trim()) {
      setError('First and last name are required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/admin/events/${eventId}/poros-liability/manual`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...form,
            participantAge: form.participantAge ? parseInt(form.participantAge, 10) : undefined,
            needsHousing: form.needsHousing === 'yes' ? true : form.needsHousing === 'no' ? false : undefined,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save form')
        return
      }
      const data = await res.json()
      setCreatedFormId(data.formId)
      onUpdate()
    } catch {
      setError('Failed to save form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setForm(initialForm)
    setCreatedFormId(null)
    setError(null)
  }

  if (createdFormId) {
    return (
      <div className="space-y-6">
        <Card className="p-8 bg-white border-[#D1D5DB] text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">Form Created Successfully</h2>
          <p className="text-gray-600 mb-6">
            The liability form has been manually entered and approved.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => window.open(`/api/liability/forms/${createdFormId}/pdf`, '_blank')}
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Copy
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Enter Another Form
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <PenLine className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Manual Entry</strong> — Use this form to enter liability information on behalf of a participant
            who is completing a paper form or is unable to fill it out online. The form will be marked as approved upon submission.
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Type */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Form Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Form Type *</Label>
              <Select value={form.formType} onValueChange={v => set('formType', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasParticipantTypeSelect && (
              <div>
                <Label>Participant Type</Label>
                <Select value={form.participantType} onValueChange={v => set('participantType', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_TYPE_FOR_FORM[form.formType].map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Participant Info */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">1. Participant Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                className="mt-1"
                value={form.participantFirstName}
                onChange={e => set('participantFirstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                className="mt-1"
                value={form.participantLastName}
                onChange={e => set('participantLastName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Preferred Name</Label>
              <Input
                className="mt-1"
                value={form.participantPreferredName}
                onChange={e => set('participantPreferredName', e.target.value)}
              />
            </div>
            <div>
              <Label>{isYouth ? 'Age' : 'Age'}</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={120}
                value={form.participantAge}
                onChange={e => set('participantAge', e.target.value)}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.participantGender} onValueChange={v => set('participantGender', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>T-Shirt Size</Label>
              <Select value={form.tShirtSize} onValueChange={v => set('tShirtSize', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(isAdult || isClergy || isReligious) && (
              <>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    value={form.participantEmail}
                    onChange={e => set('participantEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1"
                    value={form.participantPhone}
                    onChange={e => set('participantPhone', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Clergy-specific fields */}
          {(isClergy || isReligious) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {isClergy && (
                <div>
                  <Label>Clergy Title</Label>
                  <Select value={form.clergyTitle} onValueChange={v => set('clergyTitle', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="deacon">Deacon</SelectItem>
                      <SelectItem value="mr">Mr. (Seminarian)</SelectItem>
                      <SelectItem value="most_reverend">Most Reverend (Bishop)</SelectItem>
                      <SelectItem value="seminarian">Seminarian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>{isClergy ? 'Diocese of Incardination' : 'Religious Order / Congregation'}</Label>
                <Input
                  className="mt-1"
                  value={form.dioceseOfIncardination}
                  onChange={e => set('dioceseOfIncardination', e.target.value)}
                />
              </div>
              <div>
                <Label>{isClergy ? 'Current Assignment / Parish' : 'Current Convent / House'}</Label>
                <Input
                  className="mt-1"
                  value={form.currentAssignment}
                  onChange={e => set('currentAssignment', e.target.value)}
                />
              </div>
              {isClergy && (
                <div className="md:col-span-2">
                  <Label>Faculty Information</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={form.facultyInformation}
                    onChange={e => set('facultyInformation', e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label>Needs Housing</Label>
                <Select value={form.needsHousing} onValueChange={v => set('needsHousing', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Card>

        {/* Medical Information */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">2. Medical Information</h3>
          <p className="text-sm text-gray-500 mb-4">Write None if not applicable.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Medical Conditions</Label>
              <Textarea className="mt-1" rows={2} value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} />
            </div>
            <div>
              <Label>Current Medications</Label>
              <Textarea className="mt-1" rows={2} value={form.medications} onChange={e => set('medications', e.target.value)} />
            </div>
            <div>
              <Label>Allergies</Label>
              <Textarea className="mt-1" rows={2} value={form.allergies} onChange={e => set('allergies', e.target.value)} />
            </div>
            <div>
              <Label>Dietary Restrictions</Label>
              <Textarea className="mt-1" rows={2} value={form.dietaryRestrictions} onChange={e => set('dietaryRestrictions', e.target.value)} />
            </div>
            <div>
              <Label>ADA Accommodations</Label>
              <Textarea className="mt-1" rows={2} value={form.adaAccommodations} onChange={e => set('adaAccommodations', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Emergency Contacts */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">3. Emergency Contacts</h3>
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-3">Primary Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={form.emergencyContact1Name} onChange={e => set('emergencyContact1Name', e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1" value={form.emergencyContact1Phone} onChange={e => set('emergencyContact1Phone', e.target.value)} />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input className="mt-1" value={form.emergencyContact1Relation} onChange={e => set('emergencyContact1Relation', e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Secondary Contact (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={form.emergencyContact2Name} onChange={e => set('emergencyContact2Name', e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1" value={form.emergencyContact2Phone} onChange={e => set('emergencyContact2Phone', e.target.value)} />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input className="mt-1" value={form.emergencyContact2Relation} onChange={e => set('emergencyContact2Relation', e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        {/* Insurance */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">4. Insurance Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Insurance Provider</Label>
              <Input className="mt-1" value={form.insuranceProvider} onChange={e => set('insuranceProvider', e.target.value)} />
            </div>
            <div>
              <Label>Policy Number</Label>
              <Input className="mt-1" value={form.insurancePolicyNumber} onChange={e => set('insurancePolicyNumber', e.target.value)} />
            </div>
            <div>
              <Label>Group Number</Label>
              <Input className="mt-1" value={form.insuranceGroupNumber} onChange={e => set('insuranceGroupNumber', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Signature */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">5. Signature</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isYouth
              ? 'Enter the parent or guardian\'s full legal name as the signer.'
              : 'Enter the participant\'s full legal name as the signer.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{isYouth ? 'Parent / Guardian Full Legal Name' : 'Participant Full Legal Name'}</Label>
              <Input
                className="mt-1"
                value={form.signerFullLegalName}
                onChange={e => set('signerFullLegalName', e.target.value)}
                placeholder={`${form.participantFirstName} ${form.participantLastName}`.trim() || 'Full legal name'}
              />
            </div>
            <div>
              <Label>Date Signed</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.dateSigned}
                onChange={e => set('dateSigned', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleReset}>
            Clear Form
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><PenLine className="w-4 h-4 mr-2" /> Save Manual Entry</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
