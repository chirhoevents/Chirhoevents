'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Loader2, CheckCircle, XCircle, ExternalLink, FileText } from 'lucide-react'

interface LettersTabProps {
  eventId: string
}

interface Letter {
  id: string
  participantName: string
  participantType: string
  submissionMethod: string
  status: string
  originalFilename: string | null
  fileUrl: string | null
  uploadedAt: string | null
  submittedToContact: string | null
  submittedToEmail: string | null
  externalSubmissionNotes: string | null
  verifiedBy: { firstName: string; lastName: string } | null
  verifiedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

interface Summary {
  total: number
  pending: number
  submittedExternally: number
  uploaded: number
  verified: number
  rejected: number
}

interface LogsSettings {
  method: string
  contactName: string
  contactEmail: string
  instructions: string
  requiredFor: string[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  submitted_externally: { label: 'Submitted Externally', color: 'bg-blue-100 text-blue-800' },
  uploaded: { label: 'Uploaded', color: 'bg-purple-100 text-purple-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
}

const PARTICIPANT_TYPE_LABELS: Record<string, string> = {
  youth_u18: 'Youth U18',
  youth_o18: 'Youth 18+',
  chaperone: 'Chaperone',
  priest: 'Priest',
  deacon: 'Deacon',
  seminarian: 'Seminarian',
  religious_sister: 'Religious Sister',
  religious_brother: 'Religious Brother',
}

const ALL_TYPES = Object.keys(PARTICIPANT_TYPE_LABELS)

export function LettersTab({ eventId }: LettersTabProps) {
  const { getToken } = useAuth()
  const [letters, setLetters] = useState<Letter[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Settings state
  const [settings, setSettings] = useState<LogsSettings>({
    method: 'both',
    contactName: '',
    contactEmail: '',
    instructions: '',
    requiredFor: ['priest', 'deacon', 'seminarian'],
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Reject dialog state
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchLetters = useCallback(async () => {
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(
        `/api/admin/events/${eventId}/letters-of-good-standing?${params}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (!res.ok) return
      const data = await res.json()
      setLetters(data.letters ?? [])
      setSummary(data.summary ?? null)
    } catch (err) {
      console.error('Failed to fetch letters:', err)
    }
  }, [eventId, statusFilter, typeFilter, getToken])

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return
      const data = await res.json()
      const s = data.event?.settings ?? data.settings ?? {}
      setSettings({
        method: s.letterOfGoodStandingMethod ?? 'both',
        contactName: s.letterOfGoodStandingContactName ?? '',
        contactEmail: s.letterOfGoodStandingContactEmail ?? '',
        instructions: s.letterOfGoodStandingInstructions ?? '',
        requiredFor: s.letterOfGoodStandingRequiredFor ?? ['priest', 'deacon', 'seminarian'],
      })
    } catch (err) {
      console.error('Failed to fetch event settings:', err)
    } finally {
      setSettingsLoading(false)
    }
  }, [eventId, getToken])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchLetters(), fetchSettings()]).finally(() => setLoading(false))
  }, [fetchLetters, fetchSettings])

  async function saveSettings() {
    setSavingSettings(true)
    setSettingsError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          letterOfGoodStandingMethod: settings.method,
          letterOfGoodStandingContactName: settings.contactName || null,
          letterOfGoodStandingContactEmail: settings.contactEmail || null,
          letterOfGoodStandingInstructions: settings.instructions || null,
          letterOfGoodStandingRequiredFor: settings.requiredFor,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save settings')
      }
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleVerify(letterId: string) {
    setActionLoading(letterId)
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/admin/events/${eventId}/letters-of-good-standing/${letterId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: 'verified' }),
        }
      )
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to verify')
      }
      await fetchLetters()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(letterId: string) {
    if (!rejectionReason.trim()) return
    setActionLoading(letterId)
    try {
      const token = await getToken()
      const res = await fetch(
        `/api/admin/events/${eventId}/letters-of-good-standing/${letterId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: 'rejected', rejection_reason: rejectionReason }),
        }
      )
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to reject')
      }
      setRejectingId(null)
      setRejectionReason('')
      await fetchLetters()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  function toggleRequiredFor(type: string) {
    setSettings(prev => ({
      ...prev,
      requiredFor: prev.requiredFor.includes(type)
        ? prev.requiredFor.filter(t => t !== type)
        : [...prev.requiredFor, type],
    }))
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
      {/* Event-level LOGS settings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1E3A5F]">Letter of Good Standing Settings</h3>
            <p className="text-sm text-gray-600">
              Configure how participants submit their Letter of Good Standing
            </p>
          </div>
          <Button
            onClick={saveSettings}
            disabled={savingSettings || settingsLoading}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {savingSettings ? 'Saving...' : settingsSaved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>

        {settingsError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm mb-4">
            {settingsError}
          </div>
        )}

        {settingsLoading ? (
          <div className="flex items-center gap-2 text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Submission Method</Label>
              <div className="flex gap-4 mt-2">
                {[
                  { value: 'file_upload', label: 'File Upload Only' },
                  { value: 'instructions_only', label: 'Instructions Only (no upload)' },
                  { value: 'both', label: 'Both Options' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="logsMethod"
                      value={opt.value}
                      checked={settings.method === opt.value}
                      onChange={() => setSettings(prev => ({ ...prev, method: opt.value }))}
                      className="text-[#1E3A5F]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {(settings.method === 'external_submission' || settings.method === 'both') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <Label className="text-sm">Contact Name</Label>
                  <Input
                    value={settings.contactName}
                    onChange={e => setSettings(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Who to address the letter to"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Contact Email</Label>
                  <Input
                    type="email"
                    value={settings.contactEmail}
                    onChange={e => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Where to send the letter"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Instructions for Participants</Label>
              <Textarea
                value={settings.instructions}
                onChange={e => setSettings(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Explain what a Letter of Good Standing is and how to obtain one..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Required For</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {ALL_TYPES.map(type => (
                  <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.requiredFor.includes(type)}
                      onChange={() => toggleRequiredFor(type)}
                      className="rounded border-gray-300 text-[#1E3A5F]"
                    />
                    {PARTICIPANT_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: summary.total, color: 'bg-gray-100 text-gray-800' },
            { label: 'Pending', value: summary.pending, color: 'bg-yellow-100 text-yellow-800' },
            { label: 'Ext. Submitted', value: summary.submittedExternally, color: 'bg-blue-100 text-blue-800' },
            { label: 'Uploaded', value: summary.uploaded, color: 'bg-purple-100 text-purple-800' },
            { label: 'Verified', value: summary.verified, color: 'bg-green-100 text-green-800' },
            { label: 'Rejected', value: summary.rejected, color: 'bg-red-100 text-red-800' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-lg p-3 text-center ${stat.color}`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + table */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F]"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F]"
          >
            <option value="">All Types</option>
            {Object.entries(PARTICIPANT_TYPE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {letters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No letters of good standing found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-4 font-semibold text-gray-600">Participant</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-600">Type</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-600">Method</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-600">Status</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-600">File / Notes</th>
                  <th className="pb-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {letters.map(letter => {
                  const statusInfo = STATUS_LABELS[letter.status] ?? { label: letter.status, color: 'bg-gray-100 text-gray-800' }
                  const canAct = letter.status === 'uploaded' || letter.status === 'submitted_externally'
                  const isRejecting = rejectingId === letter.id

                  return (
                    <tr key={letter.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-[#1E3A5F]">{letter.participantName}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {PARTICIPANT_TYPE_LABELS[letter.participantType] ?? letter.participantType}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 capitalize">
                        {letter.submissionMethod === 'file_upload' ? 'Upload' : 'External'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {letter.fileUrl && letter.originalFilename && (
                          <a
                            href={letter.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1E3A5F] hover:underline text-xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {letter.originalFilename}
                          </a>
                        )}
                        {letter.submissionMethod === 'external_submission' && (
                          <div className="text-xs text-gray-500">
                            To: {letter.submittedToContact ?? letter.submittedToEmail ?? '—'}
                          </div>
                        )}
                        {letter.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">Reason: {letter.rejectionReason}</div>
                        )}
                      </td>
                      <td className="py-3">
                        {canAct && !isRejecting && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerify(letter.id)}
                              disabled={actionLoading === letter.id}
                              className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectingId(letter.id)}
                              className="h-7 px-2 text-red-700 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {isRejecting && (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <Input
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              placeholder="Reason for rejection"
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleReject(letter.id)}
                                disabled={!rejectionReason.trim() || actionLoading === letter.id}
                                className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRejectingId(null); setRejectionReason('') }}
                                className="h-6 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        {letter.verifiedBy && (
                          <div className="text-xs text-gray-500">
                            By {letter.verifiedBy.firstName} {letter.verifiedBy.lastName}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
