'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Eye, Save, X, Loader2, Plus } from 'lucide-react'

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
  customSections: any | null
  version: number
  active: boolean
}

const DEFAULT_WAIVER_TEXTS = {
  generalWaiverText: `I hereby release and hold harmless [Organization Name], its officers, employees, and volunteers from any and all liability for injuries or damages that may occur during participation in [Event Name]. I understand that participation in this event involves certain risks and I voluntarily assume all such risks.`,
  medicalReleaseText: `In the event of a medical emergency, I authorize [Organization Name] and its representatives to secure necessary medical treatment for the participant. I understand that reasonable efforts will be made to contact me in the event of an emergency, but that immediate medical decisions may need to be made in my absence.`,
  photoVideoConsentText: `I grant permission for [Organization Name] to use photographs and video recordings of the participant for promotional purposes, including but not limited to social media, website, and printed materials. I understand that the participant's name may or may not be used in conjunction with these images.`,
  transportationConsentText: `I give permission for the participant to be transported in vehicles driven by adult staff members or volunteers for activities related to [Event Name]. I understand that all drivers will be properly licensed and insured.`,
  emergencyTreatmentText: `I authorize emergency medical treatment including but not limited to first aid, CPR, AED use, ambulance transport, emergency room treatment, and surgery if deemed necessary by medical professionals. I agree to assume financial responsibility for all medical expenses incurred.`
}

export function TemplatesTab({ eventId, organizationId }: TemplatesTabProps) {
  const { getToken } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [organizationId])

  async function fetchTemplates() {
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/liability-templates`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      )
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)

        // Load first template or create new
        if (data.length > 0) {
          setCurrentTemplate(data[0])
        } else {
          createNewTemplate()
        }
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  function createNewTemplate() {
    setCurrentTemplate({
      id: '',
      templateName: 'New Waiver Template',
      description: '',
      formType: 'youth_u18',
      generalWaiverText: '',
      medicalReleaseText: '',
      photoVideoConsentText: '',
      transportationConsentText: '',
      emergencyTreatmentText: '',
      customSections: [],
      version: 1,
      active: true
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!currentTemplate) return

    setSaving(true)

    try {
      const token = await getToken()
      const url = currentTemplate.id
        ? `/api/admin/organizations/${organizationId}/liability-templates/${currentTemplate.id}`
        : `/api/admin/organizations/${organizationId}/liability-templates`

      const method = currentTemplate.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(currentTemplate)
      })

      if (response.ok) {
        alert('Template saved successfully!')
        setEditing(false)
        fetchTemplates()
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.error}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  function applyDefaultText(field: keyof typeof DEFAULT_WAIVER_TEXTS) {
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        [field]: DEFAULT_WAIVER_TEXTS[field]
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1E3A5F]">Waiver & Consent Wording</h3>
          <p className="text-sm text-gray-600">
            Customize the legal wording that appears on liability forms
          </p>
        </div>

        <div className="flex gap-2">
          {!editing && (
            <>
              <Button variant="outline" onClick={createNewTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
              <Button onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  fetchTemplates()
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Template Selector */}
      {templates.length > 1 && (
        <Card className="p-4 bg-white border-[#D1D5DB]">
          <Label>Select Template</Label>
          <select
            className="w-full mt-1 p-2 border rounded"
            value={currentTemplate?.id || ''}
            onChange={(e) => {
              const template = templates.find(t => t.id === e.target.value)
              if (template) {
                setCurrentTemplate(template)
                setEditing(false)
              }
            }}
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.templateName || `Template ${t.version}`} {t.active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Template Editor */}
      {currentTemplate && (
        <div className="space-y-4">
          {/* Template Name & Description */}
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <div className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={currentTemplate.templateName || ''}
                  onChange={(e) => setCurrentTemplate({
                    ...currentTemplate,
                    templateName: e.target.value
                  })}
                  disabled={!editing}
                  placeholder="e.g., Youth Retreat Waiver 2025"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={currentTemplate.description || ''}
                  onChange={(e) => setCurrentTemplate({
                    ...currentTemplate,
                    description: e.target.value
                  })}
                  disabled={!editing}
                  placeholder="Internal description of this template"
                />
              </div>
            </div>
          </Card>

          {/* General Waiver */}
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h4 className="font-semibold text-[#1E3A5F] mb-3">General Waiver & Release</h4>
            <p className="text-sm text-gray-600 mb-3">
              This text appears as the main liability waiver participants must agree to.
            </p>
            <Textarea
              value={currentTemplate.generalWaiverText || ''}
              onChange={(e) => setCurrentTemplate({
                ...currentTemplate,
                generalWaiverText: e.target.value
              })}
              disabled={!editing}
              rows={8}
              placeholder="I hereby release and hold harmless [Organization Name]..."
            />
            {!currentTemplate.generalWaiverText && editing && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => applyDefaultText('generalWaiverText')}
              >
                Use Default Template
              </Button>
            )}
          </Card>

          {/* Medical Release */}
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h4 className="font-semibold text-[#1E3A5F] mb-3">Medical Release</h4>
            <p className="text-sm text-gray-600 mb-3">
              Authorization for emergency medical treatment.
            </p>
            <Textarea
              value={currentTemplate.medicalReleaseText || ''}
              onChange={(e) => setCurrentTemplate({
                ...currentTemplate,
                medicalReleaseText: e.target.value
              })}
              disabled={!editing}
              rows={6}
              placeholder="In the event of a medical emergency..."
            />
            {!currentTemplate.medicalReleaseText && editing && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => applyDefaultText('medicalReleaseText')}
              >
                Use Default Template
              </Button>
            )}
          </Card>

          {/* Photo/Video Consent */}
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h4 className="font-semibold text-[#1E3A5F] mb-3">Photo & Video Consent</h4>
            <p className="text-sm text-gray-600 mb-3">
              Permission to use participant&apos;s image in promotional materials.
            </p>
            <Textarea
              value={currentTemplate.photoVideoConsentText || ''}
              onChange={(e) => setCurrentTemplate({
                ...currentTemplate,
                photoVideoConsentText: e.target.value
              })}
              disabled={!editing}
              rows={5}
              placeholder="I grant permission for photos/videos..."
            />
            {!currentTemplate.photoVideoConsentText && editing && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => applyDefaultText('photoVideoConsentText')}
              >
                Use Default Template
              </Button>
            )}
          </Card>

          {/* Transportation Consent */}
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h4 className="font-semibold text-[#1E3A5F] mb-3">Transportation Consent</h4>
            <p className="text-sm text-gray-600 mb-3">
              Permission for transportation during the event.
            </p>
            <Textarea
              value={currentTemplate.transportationConsentText || ''}
              onChange={(e) => setCurrentTemplate({
                ...currentTemplate,
                transportationConsentText: e.target.value
              })}
              disabled={!editing}
              rows={5}
              placeholder="I give permission for transportation..."
            />
            {!currentTemplate.transportationConsentText && editing && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => applyDefaultText('transportationConsentText')}
              >
                Use Default Template
              </Button>
            )}
          </Card>

          {/* Emergency Treatment */}
          <Card className="p-6 bg-white border-[#D1D5DB]">
            <h4 className="font-semibold text-[#1E3A5F] mb-3">Emergency Treatment Authorization</h4>
            <p className="text-sm text-gray-600 mb-3">
              Specific authorization for emergency medical treatment.
            </p>
            <Textarea
              value={currentTemplate.emergencyTreatmentText || ''}
              onChange={(e) => setCurrentTemplate({
                ...currentTemplate,
                emergencyTreatmentText: e.target.value
              })}
              disabled={!editing}
              rows={5}
              placeholder="I authorize emergency medical treatment..."
            />
            {!currentTemplate.emergencyTreatmentText && editing && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => applyDefaultText('emergencyTreatmentText')}
              >
                Use Default Template
              </Button>
            )}
          </Card>

          {/* Preview Section */}
          {!editing && (
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </h4>
              <p className="text-sm text-gray-700">
                This is how participants will see the waiver text on their liability forms.
                The actual form will include checkboxes for each section and signature fields.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
