'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Save, X, Loader2, Plus, Eye } from 'lucide-react'

interface TemplatesTabProps {
  eventId: string
  organizationId: string
}

interface Template {
  id: string
  templateName: string | null
  description: string | null
  formType: string
  eventId?: string | null
  generalWaiverText: string | null
  medicalReleaseText: string | null
  photoVideoConsentText: string | null
  transportationConsentText: string | null
  emergencyTreatmentText: string | null
  customSections: unknown | null
  version: number
  active: boolean
}

const FORM_TYPES: { value: string; label: string; description: string }[] = [
  {
    value: 'youth_u18',
    label: 'Minors (Under 18)',
    description: 'Parent or legal guardian signs on behalf of the minor. Uses "my child" language. Matches the Minor Permission Form structure.',
  },
  {
    value: 'youth_o18_chaperone',
    label: 'Adults & Chaperones (18+)',
    description: 'Self-signed by adult participants and chaperones. Matches the Adult Participant Permission Form structure.',
  },
  {
    value: 'clergy',
    label: 'Clergy & Seminarians',
    description: 'For priests, bishops, deacons, seminarians, and anyone using Mr. as their title.',
  },
  {
    value: 'religious',
    label: 'Religious (Sisters & Brothers)',
    description: 'For women and men in consecrated religious life — Sisters, Brothers, and members of religious orders.',
  },
]

const DEFAULT_TEXTS: Record<string, Record<string, string>> = {
  youth_u18: {
    generalWaiverText: `Waiver and Release: Parent hereby releases, forever discharges, and agrees to hold harmless [Organization Name], including its successors, assigns, affiliates, directors, officers, employees, and agents, from any and all liability, claims, and demands of whatever kind or nature, either in law or in equity, which arise or may hereafter arise from any matter related to the Participant engaging in or otherwise participating in [Activity Name], except to the extent arising out of the gross negligence or intentional misconduct of [Organization Name]. Parent acknowledges and understands that Parent is releasing [Organization Name] from any and all liability for injury, illness, death, or property damage resulting from any matter related to the Participant engaging in [Activity Name] to the fullest extent permitted by applicable law.

Assumption of Risk: Parent hereby acknowledges the risks, including all risks associated with potentially high-risk activities, e.g., sports, of having the Participant involved in any way in [Activity Name] and hereby expressly assumes any and all risk of injury, illness, and harm associated with the Participant engaging in [Activity Name].

Minors: Parent hereby agrees and understands that all provisions of this Permission Form, including but not limited to the Waiver and Release and Assumption of Risk sections above, are also made on behalf of the Participant, a minor entrusted to their care, to the fullest extent permitted by applicable law. Parent agrees to help assist, explain, and stress the importance of any rules, guidelines, or behavioral standards of [Organization Name] to the Participant, as age appropriate. [Organization Name] does not permit the Participant to (a) possess, obtain, use, or abuse alcohol, tobacco, or any other illegal substances; or (b) possess, obtain, or use a weapon of any kind, including pocketknives. Parent understands that violation of either parochial or organizational standards may result in discipline including and up to being prohibited from attending or otherwise engaging in [Activity Name].

I, the undersigned Parent/Guardian, certify that I have read this Permission Form in its entirety, that this is a legally binding waiver and release of liability, and that I am at least eighteen (18) years of age. I sign this Permission Form voluntarily and of my own free will on my behalf and on behalf of any minors under my care. I understand that this Permission Form is mandatory for my participation and the participation of any minors under my care in [Activity Name].`,
    medicalReleaseText: `In the event of an accident, illness, or injury during [Activity Name], the Parent authorizes [Organization Name] and its designated representatives to secure necessary emergency medical treatment for the Participant, including first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures as deemed necessary by qualified medical personnel. Every reasonable effort will be made to contact the Parent prior to major medical decisions; however, if the Parent cannot be reached in a timely manner, treatment may proceed in the best interest of the Participant. The Parent accepts financial responsibility for any medical expenses incurred.`,
    photoVideoConsentText: `The Parent understands that [Activity Name] may be photographed, videotaped, or recorded and hereby grants permission to [Organization Name] to use the image and likeness of the Participant, in the sole discretion of [Organization Name], in any and all organizational media. Parties agree that compensation for the image and likeness of the Participant is limited to the adequate and valuable consideration described herein. Certain events, such as the Holy Mass and other large-scale gatherings, should be considered public events.`,
    transportationConsentText: `The Parent grants permission for the Participant to be transported to and from [Activity Name] and any related off-site locations in vehicles operated by licensed drivers authorized by [Organization Name]. All drivers are required to hold valid driver's licenses and maintain appropriate vehicle insurance.`,
    emergencyTreatmentText: `The Parent authorizes [Organization Name] and its representatives to arrange emergency medical treatment for the Participant — including first aid, CPR, AED use, ambulance transport, emergency room treatment, hospitalization, and surgical procedures — as deemed necessary by medical professionals. The Parent accepts financial responsibility for all medical expenses incurred.`,
  },
  youth_o18_chaperone: {
    generalWaiverText: `Waiver and Release: I hereby release, forever discharge, and agree to hold harmless [Organization Name], including its successors, assigns, affiliates, directors, officers, employees, and agents, from any and all liability, claims, and demands of whatever kind or nature, either in law or in equity, which arise or may hereafter arise from any matter related to my engaging in or otherwise participating in [Activity Name], except to the extent arising out of the gross negligence or intentional misconduct of [Organization Name]. I acknowledge and understand that I am releasing [Organization Name] from any and all liability for injury, illness, death, or property damage resulting from any matter related to my engaging in [Activity Name] to the fullest extent permitted by applicable law.

Assumption of Risk: I hereby acknowledge the risks, including all risks associated with potentially high-risk activities, e.g., sports, of being involved in any way in [Activity Name] and hereby expressly assume any and all risk of injury, illness, and harm associated with engaging in [Activity Name].

I, the undersigned Participant, certify that I have read this Permission Form in its entirety, that this is a legally binding waiver and release of liability, and that I am at least eighteen (18) years of age. I sign this Permission Form voluntarily and of my own free will on my behalf and on behalf of any minors under my care. I understand that this Permission Form is mandatory for my participation and the participation of any minors under my care in [Activity Name].`,
    medicalReleaseText: `In the event of an accident, illness, or injury during [Activity Name], I authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for me, including first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures as deemed necessary by qualified medical personnel. Every reasonable effort will be made to contact me or my emergency contact prior to major medical decisions. I accept financial responsibility for any medical expenses incurred.`,
    photoVideoConsentText: `I understand that [Activity Name] may be photographed, videotaped, or recorded and hereby grant permission to [Organization Name] to use my image and likeness, in the sole discretion of [Organization Name], in any and all organizational media. Parties agree that compensation for my image and likeness is limited to the adequate and valuable consideration described herein. Certain events, such as the Holy Mass and other large-scale gatherings, should be considered public events.`,
    transportationConsentText: `I grant permission to be transported to and from [Activity Name] and any related off-site locations in vehicles operated by licensed drivers authorized by [Organization Name]. All drivers are required to hold valid driver's licenses and maintain appropriate vehicle insurance.`,
    emergencyTreatmentText: `I authorize [Organization Name] and its representatives to arrange emergency medical treatment for me — including first aid, CPR, AED use, ambulance transport, emergency room treatment, hospitalization, and surgical procedures — as deemed necessary by medical professionals. I accept financial responsibility for all medical expenses incurred.`,
  },
  clergy: {
    generalWaiverText: `Waiver and Release: I hereby release, forever discharge, and agree to hold harmless [Organization Name], including its successors, assigns, affiliates, directors, officers, employees, and agents, from any and all liability, claims, and demands of whatever kind or nature, either in law or in equity, which arise or may hereafter arise from any matter related to my engaging in or otherwise participating in [Activity Name], except to the extent arising out of the gross negligence or intentional misconduct of [Organization Name]. I acknowledge and understand that I am releasing [Organization Name] from any and all liability for injury, illness, death, or property damage resulting from any matter related to my engaging in [Activity Name] to the fullest extent permitted by applicable law.

Assumption of Risk: I hereby acknowledge the risks, including all risks associated with potentially high-risk activities, e.g., sports, of being involved in any way in [Activity Name] and hereby expressly assume any and all risk of injury, illness, and harm associated with engaging in [Activity Name].

I, the undersigned Participant, certify that I have read this Permission Form in its entirety, that this is a legally binding waiver and release of liability, and that I am at least eighteen (18) years of age. I sign this Permission Form voluntarily and of my own free will. I understand that this Permission Form is mandatory for my participation in [Activity Name].`,
    medicalReleaseText: `In the event of an accident, illness, or injury during [Activity Name], I authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for me, including first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures as deemed necessary by qualified medical personnel. Every reasonable effort will be made to contact me or my emergency contact prior to major medical decisions. I accept financial responsibility for any medical expenses incurred.`,
    photoVideoConsentText: `I understand that [Activity Name] may be photographed, videotaped, or recorded and hereby grant permission to [Organization Name] to use my image and likeness, in the sole discretion of [Organization Name], in any and all organizational media. Parties agree that compensation for my image and likeness is limited to the adequate and valuable consideration described herein. Certain events, such as the Holy Mass and other large-scale gatherings, should be considered public events.`,
    transportationConsentText: ``,
    emergencyTreatmentText: `I authorize [Organization Name] and its representatives to arrange emergency medical treatment for me — including first aid, CPR, AED use, ambulance transport, emergency room treatment, and hospitalization — as deemed necessary by medical professionals. I accept financial responsibility for all medical expenses incurred.`,
  },
  religious: {
    generalWaiverText: `Waiver and Release: I hereby release, forever discharge, and agree to hold harmless [Organization Name], including its successors, assigns, affiliates, directors, officers, employees, and agents, from any and all liability, claims, and demands of whatever kind or nature, either in law or in equity, which arise or may hereafter arise from any matter related to my engaging in or otherwise participating in [Activity Name], except to the extent arising out of the gross negligence or intentional misconduct of [Organization Name]. I acknowledge and understand that I am releasing [Organization Name] from any and all liability for injury, illness, death, or property damage resulting from any matter related to my engaging in [Activity Name] to the fullest extent permitted by applicable law.

Assumption of Risk: I hereby acknowledge the risks, including all risks associated with potentially high-risk activities, e.g., sports, of being involved in any way in [Activity Name] and hereby expressly assume any and all risk of injury, illness, and harm associated with engaging in [Activity Name].

I, the undersigned Participant, certify that I have read this Permission Form in its entirety, that this is a legally binding waiver and release of liability, and that I am at least eighteen (18) years of age. I sign this Permission Form voluntarily and of my own free will. I understand that this Permission Form is mandatory for my participation in [Activity Name].`,
    medicalReleaseText: `In the event of an accident, illness, or injury during [Activity Name], I authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for me, including first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures as deemed necessary by qualified medical personnel. Every reasonable effort will be made to contact me or my emergency contact prior to major medical decisions. I accept financial responsibility for any medical expenses incurred.`,
    photoVideoConsentText: `I understand that [Activity Name] may be photographed, videotaped, or recorded and hereby grant permission to [Organization Name] to use my image and likeness, in the sole discretion of [Organization Name], in any and all organizational media. Parties agree that compensation for my image and likeness is limited to the adequate and valuable consideration described herein. Certain events, such as the Holy Mass and other large-scale gatherings, should be considered public events.`,
    transportationConsentText: ``,
    emergencyTreatmentText: `I authorize [Organization Name] and its representatives to arrange emergency medical treatment for me — including first aid, CPR, AED use, ambulance transport, emergency room treatment, and hospitalization — as deemed necessary by medical professionals. I accept financial responsibility for all medical expenses incurred.`,
  },
}

function emptyTemplate(formType: string): Template {
  return {
    id: '',
    templateName: null,
    description: null,
    formType,
    generalWaiverText: null,
    medicalReleaseText: null,
    photoVideoConsentText: null,
    transportationConsentText: null,
    emergencyTreatmentText: null,
    customSections: [],
    version: 1,
    active: true,
  }
}

export function TemplatesTab({ eventId, organizationId }: TemplatesTabProps) {
  const { getToken } = useAuth()
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [activeFormType, setActiveFormType] = useState('youth_u18')
  const [current, setCurrent] = useState<Template>(emptyTemplate('youth_u18'))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [organizationId])

  // When active form type changes, load the matching template (event-specific preferred)
  useEffect(() => {
    const match =
      allTemplates.find(t => t.formType === activeFormType && t.active && t.eventId === eventId) ??
      allTemplates.find(t => t.formType === activeFormType && t.active) ??
      allTemplates.find(t => t.formType === activeFormType)
    setCurrent(match ?? emptyTemplate(activeFormType))
    setEditing(false)
    setError(null)
    setSaved(false)
  }, [activeFormType, allTemplates, eventId])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/admin/organizations/${organizationId}/liability-templates`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (!res.ok) throw new Error('Failed to load templates')
      const data: Template[] = await res.json()
      setAllTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  function applyDefaults() {
    const defaults = DEFAULT_TEXTS[activeFormType] ?? {}
    setCurrent(prev => ({
      ...prev,
      generalWaiverText: defaults.generalWaiverText ?? prev.generalWaiverText,
      medicalReleaseText: defaults.medicalReleaseText ?? prev.medicalReleaseText,
      photoVideoConsentText: defaults.photoVideoConsentText ?? prev.photoVideoConsentText,
      transportationConsentText: defaults.transportationConsentText ?? prev.transportationConsentText,
      emergencyTreatmentText: defaults.emergencyTreatmentText ?? prev.emergencyTreatmentText,
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      const isNew = !current.id
      const url = isNew
        ? `/api/admin/organizations/${organizationId}/liability-templates`
        : `/api/admin/organizations/${organizationId}/liability-templates/${current.id}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...current, formType: activeFormType, ...(isNew ? { eventId } : {}) }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save template')
      }

      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
      await fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const activeTypeInfo = FORM_TYPES.find(t => t.value === activeFormType)!
  const hasTemplate = !!current.id

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1E3A5F]">Waiver &amp; Consent Wording</h3>
          <p className="text-sm text-gray-600">
            Each form type has its own legal text. Write different wording for each group.
          </p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => window.open(`/poros/preview/${eventId}?type=${activeFormType}`, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Form
              </Button>
              <Button
                onClick={() => setEditing(true)}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                {hasTemplate ? 'Edit Template' : 'Create Template'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); fetchTemplates() }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              {!hasTemplate && (
                <Button variant="outline" onClick={applyDefaults}>
                  Fill Defaults
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Template'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Form type tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {FORM_TYPES.map(ft => {
            const exists = allTemplates.some(t => t.formType === ft.value)
            return (
              <button
                key={ft.value}
                onClick={() => setActiveFormType(ft.value)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeFormType === ft.value
                    ? 'border-[#1E3A5F] text-[#1E3A5F]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {ft.label}
                {!exists && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    not set
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Context banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-800">{activeTypeInfo.label}</p>
        <p className="text-sm text-blue-700 mt-0.5">{activeTypeInfo.description}</p>
        {!hasTemplate && (
          <p className="text-sm text-amber-700 mt-2 font-medium">
            No template saved yet for this form type. Click &quot;Create Template&quot; to add wording.
          </p>
        )}
      </div>

      {/* Template name */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Template Name</Label>
            <Input
              value={current.templateName ?? ''}
              onChange={e => setCurrent(prev => ({ ...prev, templateName: e.target.value || null }))}
              disabled={!editing}
              placeholder={`${activeTypeInfo.label} Waiver`}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Internal Description (optional)</Label>
            <Input
              value={current.description ?? ''}
              onChange={e => setCurrent(prev => ({ ...prev, description: e.target.value || null }))}
              disabled={!editing}
              placeholder="e.g., updated for 2026 event"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Waiver text sections */}
      {(
        [
          { key: 'generalWaiverText', label: 'General Waiver & Release', hint: 'Main liability release — shown at the top of the consent section.' },
          { key: 'medicalReleaseText', label: 'Medical Release', hint: 'Authorization for emergency medical treatment.' },
          { key: 'photoVideoConsentText', label: 'Photo & Video Consent', hint: 'Permission to use images of the participant.' },
          { key: 'transportationConsentText', label: 'Transportation Consent', hint: 'Permission for transportation during the event. Leave blank to omit this section.' },
          { key: 'emergencyTreatmentText', label: 'Emergency Treatment Authorization', hint: 'Specific authorization for emergency procedures.' },
        ] as const
      ).map(({ key, label, hint }) => (
        <Card key={key} className="p-6">
          <h4 className="font-semibold text-[#1E3A5F] mb-1">{label}</h4>
          <p className="text-xs text-gray-500 mb-3">{hint}</p>
          <Textarea
            value={(current[key] as string) ?? ''}
            onChange={e => setCurrent(prev => ({ ...prev, [key]: e.target.value || null }))}
            disabled={!editing}
            rows={key === 'generalWaiverText' ? 8 : 5}
            placeholder={editing ? 'Enter wording for this section…' : 'No wording saved yet.'}
            className={!editing && !current[key] ? 'text-gray-400 italic' : ''}
          />
        </Card>
      ))}
    </div>
  )
}
