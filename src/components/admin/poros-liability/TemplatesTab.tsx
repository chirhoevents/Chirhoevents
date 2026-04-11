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
    label: 'Youth Under 18',
    description: 'Parent/guardian signs on behalf of the minor. Use "my child" language.',
  },
  {
    value: 'youth_o18_chaperone',
    label: 'Youth 18+ / Chaperone',
    description: 'Self-signed by adult participants and chaperones.',
  },
  {
    value: 'clergy',
    label: 'Clergy',
    description: 'For priests, deacons, and seminarians.',
  },
  {
    value: 'religious',
    label: 'Religious',
    description: 'For religious sisters and brothers.',
  },
]

const DEFAULT_TEXTS: Record<string, Record<string, string>> = {
  youth_u18: {
    generalWaiverText: `I, as parent or legal guardian of the minor named above, hereby release and hold harmless [Organization Name], its officers, employees, and volunteers from any and all liability for injuries or damages that may occur during participation in [Event Name]. I understand that participation involves certain risks and I voluntarily assume all such risks on behalf of my child.`,
    medicalReleaseText: `In the event of a medical emergency, I authorize [Organization Name] and its representatives to secure necessary medical treatment for my child. I understand that reasonable efforts will be made to contact me, but that immediate medical decisions may need to be made in my absence.`,
    photoVideoConsentText: `I grant permission for [Organization Name] to use photographs and video recordings of my child for promotional purposes including social media, website, and printed materials.`,
    transportationConsentText: `I give permission for my child to be transported in vehicles driven by licensed adult staff or volunteers for activities related to [Event Name].`,
    emergencyTreatmentText: `I authorize emergency medical treatment for my child including first aid, CPR, AED use, ambulance transport, emergency room treatment, and surgery if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred.`,
  },
  youth_o18_chaperone: {
    generalWaiverText: `I hereby release and hold harmless [Organization Name], its officers, employees, and volunteers from any and all liability for injuries or damages that may occur during my participation in [Event Name]. I understand that participation involves certain risks and I voluntarily assume all such risks.`,
    medicalReleaseText: `In the event of a medical emergency, I authorize [Organization Name] and its representatives to secure necessary medical treatment for me. I understand that reasonable efforts will be made to contact me, but that immediate decisions may need to be made.`,
    photoVideoConsentText: `I grant permission for [Organization Name] to use photographs and video recordings of me for promotional purposes including social media, website, and printed materials.`,
    transportationConsentText: `I give permission to be transported in vehicles driven by licensed adult staff or volunteers for activities related to [Event Name].`,
    emergencyTreatmentText: `I authorize emergency medical treatment including first aid, CPR, AED use, ambulance transport, emergency room treatment, and surgery if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred.`,
  },
  clergy: {
    generalWaiverText: `I hereby release and hold harmless [Organization Name], its officers, employees, and volunteers from any and all liability for injuries or damages that may occur during my participation in [Event Name] in my capacity as clergy.`,
    medicalReleaseText: `In the event of a medical emergency, I authorize [Organization Name] and its representatives to secure necessary medical treatment for me.`,
    photoVideoConsentText: `I grant permission for [Organization Name] to use photographs and video recordings of me for promotional purposes.`,
    transportationConsentText: ``,
    emergencyTreatmentText: `I authorize emergency medical treatment including first aid, CPR, AED use, ambulance transport, and emergency room treatment if deemed necessary.`,
  },
  religious: {
    generalWaiverText: `I hereby release and hold harmless [Organization Name], its officers, employees, and volunteers from any and all liability for injuries or damages that may occur during my participation in [Event Name].`,
    medicalReleaseText: `In the event of a medical emergency, I authorize [Organization Name] and its representatives to secure necessary medical treatment for me.`,
    photoVideoConsentText: `I grant permission for [Organization Name] to use photographs and video recordings of me for promotional purposes.`,
    transportationConsentText: ``,
    emergencyTreatmentText: `I authorize emergency medical treatment if deemed necessary by medical professionals.`,
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
