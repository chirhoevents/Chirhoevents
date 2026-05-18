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
    generalWaiverText: `Field Trips, Off-Site Events & Pilgrimages — Information & Permission Form
Organization/Entity: [Organization Name]
Name of Activity/Event: [Activity Name]

WAIVER AND RELEASE: I, as the parent or legal guardian of the minor named above, hereby release, waive, and discharge [Organization Name], its officers, directors, employees, agents, and volunteers (collectively, the "Organization") from any and all liability, claims, demands, causes of action, costs, and expenses, including attorneys' fees, arising from or related to my child's participation in [Activity Name], whether caused by the negligence of the Organization or otherwise. I further agree to indemnify and hold harmless the Organization from any loss, liability, damage, or costs it may incur in connection with my child's participation.

ASSUMPTION OF RISK: I acknowledge that participation in [Activity Name] involves inherent risks, including but not limited to personal injury, illness, property damage, and other hazards. I voluntarily assume all such risks on behalf of my child and understand that the Organization cannot guarantee complete safety.

PAROCHIAL POLICY: I understand that participants are expected to follow all rules and policies of [Organization Name], including refraining from the possession or use of alcohol, tobacco, illegal substances, and any items prohibited by event staff. Failure to comply may result in removal from the event at the participant's expense.`,
    medicalReleaseText: `EMERGENCY MEDICAL CARE: In the event of an accident, illness, or injury during [Activity Name], I hereby authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for my child, including but not limited to: first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures, as deemed necessary by qualified medical personnel.

I understand that every reasonable effort will be made to contact me prior to any major medical decisions. However, if I cannot be reached in a timely manner, I authorize treatment to proceed in the best interest of my child. I accept financial responsibility for any medical expenses incurred.

Insurance Provider: ________________________
Policy Number: ________________________
Subscriber/Group Number: ________________________`,
    photoVideoConsentText: `MEDIA RELEASE: I grant [Organization Name] and its authorized representatives the right and permission to photograph, videotape, and/or audio record my child during [Activity Name], and to use such recordings and images — now or in the future — for purposes including but not limited to: print publications, newsletters, promotional materials, social media platforms, and the Organization's website.

I waive any right to inspect or approve the final use of such media, and I release [Organization Name] from any and all liability arising from the use of these materials.`,
    transportationConsentText: `TRANSPORTATION: I give permission for my child to be transported to and from [Activity Name] and any related off-site locations in vehicles operated by licensed adult drivers authorized by [Organization Name]. I understand that all drivers are required to possess valid driver's licenses and maintain appropriate vehicle insurance. I release the Organization from liability for transportation-related incidents, except those arising from the Organization's gross negligence.`,
    emergencyTreatmentText: `AUTHORIZATION FOR EMERGENCY TREATMENT: I authorize [Organization Name] and its representatives to authorize emergency medical treatment for my child, including first aid, CPR, AED use, ambulance transport, emergency room treatment, hospitalization, and surgical procedures if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred as a result of such treatment and to cooperate with the Organization's insurance and billing processes.`,
  },
  youth_o18_chaperone: {
    generalWaiverText: `Field Trips, Off-Site Events & Pilgrimages — Adult Participant Information & Permission Form
Organization/Entity: [Organization Name]
Name of Activity/Event: [Activity Name]

WAIVER AND RELEASE: I hereby release, waive, and discharge [Organization Name], its officers, directors, employees, agents, and volunteers (collectively, the "Organization") from any and all liability, claims, demands, causes of action, costs, and expenses, including attorneys' fees, arising from or related to my participation in [Activity Name], whether caused by the negligence of the Organization or otherwise. I further agree to indemnify and hold harmless the Organization from any loss, liability, damage, or costs it may incur in connection with my participation.

ASSUMPTION OF RISK: I acknowledge that participation in [Activity Name] involves inherent risks, including but not limited to personal injury, illness, property damage, and other hazards. I voluntarily and knowingly assume all such risks and understand that the Organization cannot guarantee complete safety.

GENERAL PROVISIONS: This agreement shall be construed in accordance with the laws of the state in which [Activity Name] takes place. If any provision of this agreement is found to be unenforceable, the remaining provisions shall remain in full force. This is the entire agreement between the parties with respect to the subject matter hereof.`,
    medicalReleaseText: `EMERGENCY MEDICAL CARE: In the event of an accident, illness, or injury during [Activity Name], I hereby authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for me, including but not limited to: first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures, as deemed necessary by qualified medical personnel.

I understand that every reasonable effort will be made to contact me or my emergency contact prior to any major medical decisions. I accept financial responsibility for any medical expenses incurred.

Insurance Provider: ________________________
Policy Number: ________________________
Subscriber/Group Number: ________________________`,
    photoVideoConsentText: `MEDIA RELEASE: I grant [Organization Name] and its authorized representatives the right and permission to photograph, videotape, and/or audio record me during [Activity Name], and to use such recordings and images — now or in the future — for purposes including but not limited to: print publications, newsletters, promotional materials, social media platforms, and the Organization's website.

I waive any right to inspect or approve the final use of such media, and I release [Organization Name] from any and all liability arising from the use of these materials.`,
    transportationConsentText: `TRANSPORTATION: I give permission to be transported to and from [Activity Name] and any related off-site locations in vehicles operated by licensed adult drivers authorized by [Organization Name]. I understand that all drivers are required to possess valid driver's licenses and maintain appropriate vehicle insurance. I release the Organization from liability for transportation-related incidents, except those arising from the Organization's gross negligence.`,
    emergencyTreatmentText: `AUTHORIZATION FOR EMERGENCY TREATMENT: I authorize [Organization Name] and its representatives to authorize emergency medical treatment for me, including first aid, CPR, AED use, ambulance transport, emergency room treatment, hospitalization, and surgical procedures if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred as a result of such treatment.`,
  },
  clergy: {
    generalWaiverText: `Field Trips, Off-Site Events & Pilgrimages — Clergy & Religious Information & Permission Form
Organization/Entity: [Organization Name]
Name of Activity/Event: [Activity Name]

WAIVER AND RELEASE: I hereby release, waive, and discharge [Organization Name], its officers, directors, employees, agents, and volunteers (collectively, the "Organization") from any and all liability, claims, demands, causes of action, costs, and expenses, including attorneys' fees, arising from or related to my participation in [Activity Name] in my capacity as clergy or religious, whether caused by the negligence of the Organization or otherwise. I further agree to indemnify and hold harmless the Organization from any loss, liability, damage, or costs it may incur in connection with my participation.

ASSUMPTION OF RISK: I acknowledge that participation in [Activity Name] involves inherent risks, including but not limited to personal injury, illness, property damage, and other hazards. I voluntarily and knowingly assume all such risks and understand that the Organization cannot guarantee complete safety.`,
    medicalReleaseText: `EMERGENCY MEDICAL CARE: In the event of an accident, illness, or injury during [Activity Name], I hereby authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for me, including but not limited to: first aid, CPR, AED use, ambulance transport, emergency room care, hospitalization, and surgical procedures, as deemed necessary by qualified medical personnel.

I understand that every reasonable effort will be made to contact me or my emergency contact prior to any major medical decisions. I accept financial responsibility for any medical expenses incurred.

Insurance Provider: ________________________
Policy Number: ________________________
Subscriber/Group Number: ________________________`,
    photoVideoConsentText: `MEDIA RELEASE: I grant [Organization Name] and its authorized representatives the right and permission to photograph, videotape, and/or audio record me during [Activity Name], and to use such recordings and images for purposes including but not limited to: publications, promotional materials, social media, and the Organization's website.

I waive any right to inspect or approve the final use of such media, and I release [Organization Name] from any and all liability arising from the use of these materials.`,
    transportationConsentText: ``,
    emergencyTreatmentText: `AUTHORIZATION FOR EMERGENCY TREATMENT: I authorize [Organization Name] and its representatives to authorize emergency medical treatment for me, including first aid, CPR, AED use, ambulance transport, emergency room treatment, and hospitalization if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred as a result of such treatment.`,
  },
  religious: {
    generalWaiverText: `Annual Permission Form & General Release — Religious Formation & Activities
Organization/Entity: [Organization Name]
Name of Activity/Event: [Activity Name]

WAIVER AND RELEASE: I hereby release, waive, and discharge [Organization Name], its officers, directors, employees, agents, and volunteers (collectively, the "Organization") from any and all liability, claims, demands, causes of action, costs, and expenses, including attorneys' fees, arising from or related to my participation in [Activity Name], whether caused by the negligence of the Organization or otherwise. I further agree to indemnify and hold harmless the Organization from any loss, liability, damage, or costs it may incur in connection with my participation.

ASSUMPTION OF RISK: I acknowledge that participation in [Activity Name] involves inherent risks, including but not limited to personal injury, illness, property damage, and other hazards. I voluntarily and knowingly assume all such risks and understand that the Organization cannot guarantee complete safety.`,
    medicalReleaseText: `EMERGENCY MEDICAL CARE: In the event of an accident, illness, or injury during [Activity Name], I hereby authorize [Organization Name] and its designated representatives to secure necessary emergency medical treatment for me, including but not limited to: first aid, CPR, AED use, ambulance transport, emergency room care, and other medical procedures as deemed necessary by qualified medical personnel.

I understand that every reasonable effort will be made to contact me or my emergency contact prior to any major medical decisions. I accept financial responsibility for any medical expenses incurred.

Insurance Provider: ________________________
Policy Number: ________________________
Subscriber/Group Number: ________________________`,
    photoVideoConsentText: `MEDIA RELEASE: I grant [Organization Name] and its authorized representatives the right and permission to photograph, videotape, and/or audio record me during [Activity Name], and to use such recordings and images for purposes including but not limited to: publications, promotional materials, social media, and the Organization's website.

I release [Organization Name] from any and all liability arising from the use of these materials.`,
    transportationConsentText: ``,
    emergencyTreatmentText: `AUTHORIZATION FOR EMERGENCY TREATMENT: I authorize [Organization Name] and its representatives to authorize emergency medical treatment for me, including first aid, CPR, AED use, ambulance transport, emergency room treatment, and hospitalization if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred.`,
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

  // When active form type changes, load the matching template (or blank)
  useEffect(() => {
    const match = allTemplates.find(t => t.formType === activeFormType && t.active)
      ?? allTemplates.find(t => t.formType === activeFormType)
    setCurrent(match ?? emptyTemplate(activeFormType))
    setEditing(false)
    setError(null)
    setSaved(false)
  }, [activeFormType, allTemplates])

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
        body: JSON.stringify({ ...current, formType: activeFormType }),
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
