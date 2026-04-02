'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Loader2, ChevronUp, ChevronDown } from 'lucide-react'

interface SectionConfigTabProps {
  eventId: string
}

const PARTICIPANT_TYPE_LABELS: Record<string, string> = {
  youth_u18: 'Youth Under 18',
  youth_o18: 'Youth 18+',
  chaperone: 'Chaperone',
  priest: 'Priest',
  deacon: 'Deacon',
  seminarian: 'Seminarian',
  religious_sister: 'Religious Sister',
  religious_brother: 'Religious Brother',
}

const SECTION_KEY_LABELS: Record<string, string> = {
  basic_info: 'Basic Information',
  medical: 'Medical Information',
  emergency_contacts: 'Emergency Contacts',
  insurance: 'Insurance',
  clergy_info: 'Clergy / Religious Information',
  housing: 'Housing Preferences',
  safe_environment_cert: 'Safe Environment Certificate',
  letter_of_good_standing: 'Letter of Good Standing',
  custom_sections: 'Custom Sections',
  consent_signature: 'Consent & Signature',
}

interface SectionConfig {
  id?: string
  participantType: string
  sectionKey: string
  enabled: boolean
  required: boolean
  displayOrder: number
  customLabel: string | null
  helpText: string | null
}

type ConfigMap = Record<string, SectionConfig[]>

export function SectionConfigTab({ eventId }: SectionConfigTabProps) {
  const { getToken } = useAuth()
  const [activeType, setActiveType] = useState('youth_u18')
  const [configs, setConfigs] = useState<ConfigMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchConfigs()
  }, [eventId])

  async function fetchConfigs() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/form-section-configs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to load section configs')
      const data = await res.json()
      setConfigs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configs')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const token = await getToken()
      const sections = configs[activeType] ?? []
      const res = await fetch(`/api/admin/events/${eventId}/form-section-configs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ participantType: activeType, sections }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configs')
    } finally {
      setSaving(false)
    }
  }

  function updateSection(sectionKey: string, patch: Partial<SectionConfig>) {
    setConfigs(prev => ({
      ...prev,
      [activeType]: (prev[activeType] ?? []).map(s =>
        s.sectionKey === sectionKey ? { ...s, ...patch } : s
      ),
    }))
  }

  function moveSection(sectionKey: string, direction: 'up' | 'down') {
    setConfigs(prev => {
      const sections = [...(prev[activeType] ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)
      const idx = sections.findIndex(s => s.sectionKey === sectionKey)
      if (idx < 0) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sections.length) return prev
      const tempOrder = sections[idx].displayOrder
      sections[idx] = { ...sections[idx], displayOrder: sections[swapIdx].displayOrder }
      sections[swapIdx] = { ...sections[swapIdx], displayOrder: tempOrder }
      return { ...prev, [activeType]: sections }
    })
  }

  const typeSections = [...(configs[activeType] ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)

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
          <h3 className="text-lg font-semibold text-[#1E3A5F]">Form Section Configuration</h3>
          <p className="text-sm text-gray-600">
            Control which sections appear on registrant forms for each participant type.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Participant type tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 flex-wrap">
          {Object.entries(PARTICIPANT_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeType === type
                  ? 'border-[#1E3A5F] text-[#1E3A5F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Section list */}
      <div className="space-y-3">
        {typeSections.length === 0 && (
          <Card className="p-6 text-center text-gray-500">
            No section configurations found. They will be auto-created on first view.
          </Card>
        )}
        {typeSections.map((section, idx) => {
          const isFirst = idx === 0
          const isLast = idx === typeSections.length - 1
          const isLocked = section.sectionKey === 'basic_info' || section.sectionKey === 'consent_signature'

          return (
            <Card key={section.sectionKey} className={`p-4 ${!section.enabled ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => moveSection(section.sectionKey, 'up')}
                    disabled={isFirst || isLocked}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveSection(section.sectionKey, 'down')}
                    disabled={isLast || isLocked}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Enable toggle */}
                <div className="pt-2">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    disabled={isLocked}
                    onChange={e => updateSection(section.sectionKey, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1E3A5F]">
                        {SECTION_KEY_LABELS[section.sectionKey] ?? section.sectionKey}
                      </span>
                      {isLocked && (
                        <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">always on</span>
                      )}
                    </div>

                    {/* Required toggle */}
                    {section.enabled && !isLocked && (
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={section.required}
                          onChange={e => updateSection(section.sectionKey, { required: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                        />
                        Required
                      </label>
                    )}
                  </div>

                  {section.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Custom Label (optional)</Label>
                        <Input
                          value={section.customLabel ?? ''}
                          onChange={e => updateSection(section.sectionKey, { customLabel: e.target.value || null })}
                          placeholder={SECTION_KEY_LABELS[section.sectionKey] ?? section.sectionKey}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Help Text (optional)</Label>
                        <Input
                          value={section.helpText ?? ''}
                          onChange={e => updateSection(section.sectionKey, { helpText: e.target.value || null })}
                          placeholder="Shown below section title"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
