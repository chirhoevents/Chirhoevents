'use client'

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogQuestion {
  id: string
  catalogSlug: string
  catalogCategory: string
  questionText: string
  questionType: string
  options: string[] | null
  appliesTo: string
  displayOrder: number
  // Event-copy state
  enabled: boolean
  eventCopyId: string | null
  required: boolean
  hasAnswers: boolean
}

interface QuestionState {
  enabled: boolean
  required: boolean
}

interface Warning {
  catalogSlug: string
  reason: string
}

interface Props {
  eventId: string
  /** Controls which questions are shown based on the event's registration mode. */
  registrationMode: 'group' | 'individual' | 'both'
}

export interface CatalogQuestionPickerHandle {
  isDirty: boolean
  save: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  parish_info: 'Parish & Diocese Info',
  demographics: 'Demographics',
  event_experience: 'Event Experience',
  faith_sacraments: 'Faith & Sacraments',
  logistics: 'Logistics',
  dietary_accessibility: 'Dietary & Accessibility',
}

// Canonical category order
const CATEGORY_ORDER = [
  'parish_info',
  'demographics',
  'event_experience',
  'faith_sacraments',
  'logistics',
  'dietary_accessibility',
]

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  yes_no: 'Yes / No',
  multiple_choice: 'Multiple Choice',
  dropdown: 'Dropdown',
  multi_select: 'Multi-select',
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  text: 'bg-slate-100 text-slate-700',
  yes_no: 'bg-blue-100 text-blue-700',
  multiple_choice: 'bg-purple-100 text-purple-700',
  dropdown: 'bg-amber-100 text-amber-700',
  multi_select: 'bg-emerald-100 text-emerald-700',
}

const APPLIES_TO_LABELS: Record<string, string> = {
  group: 'Group only',
  individual: 'Individual only',
  both: 'Group & Individual',
}

// ---------------------------------------------------------------------------
// Helper: filter questions by registration mode
// ---------------------------------------------------------------------------
function isQuestionVisible(q: CatalogQuestion, mode: Props['registrationMode']): boolean {
  if (mode === 'group') return q.appliesTo !== 'individual'
  if (mode === 'individual') return q.appliesTo !== 'group'
  return true // 'both'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CatalogQuestionPicker = forwardRef<CatalogQuestionPickerHandle, Props>(
  function CatalogQuestionPicker({ eventId, registrationMode }, ref) {
  const { getToken } = useAuth()

  const [questions, setQuestions] = useState<CatalogQuestion[]>([])
  const [states, setStates] = useState<Record<string, QuestionState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveResult, setSaveResult] = useState<{
    success: boolean
    message: string
    warnings?: Warning[]
  } | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setSaveResult(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/events/${eventId}/catalog-questions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      const data: { questions: CatalogQuestion[] } = await res.json()
      setQuestions(data.questions)
      // Initialise local state from server state
      const initial: Record<string, QuestionState> = {}
      for (const q of data.questions) {
        initial[q.catalogSlug] = { enabled: q.enabled, required: q.required }
      }
      setStates(initial)
    } catch (err) {
      console.error('[CatalogQuestionPicker] load error:', err)
    } finally {
      setLoading(false)
      setIsDirty(false)
    }
  }, [eventId, getToken])

  useEffect(() => {
    load()
  }, [load])

  // ── Mutation helpers ─────────────────────────────────────────────────────

  function toggleEnabled(slug: string) {
    setStates((prev) => {
      const current = prev[slug]
      return { ...prev, [slug]: { ...current, enabled: !current.enabled } }
    })
    setIsDirty(true)
    setSaveResult(null)
  }

  function toggleRequired(slug: string) {
    setStates((prev) => {
      const current = prev[slug]
      return { ...prev, [slug]: { ...current, required: !current.required } }
    })
    setIsDirty(true)
    setSaveResult(null)
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveResult(null)
    try {
      const token = await getToken()
      const payload = Object.entries(states).map(([catalogSlug, s]) => ({
        catalogSlug,
        enabled: s.enabled,
        required: s.required,
      }))

      const res = await fetch(`/api/admin/events/${eventId}/catalog-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: payload }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSaveResult({ success: false, message: data.error ?? 'Save failed' })
        return
      }

      const parts: string[] = []
      if (data.created > 0) parts.push(`${data.created} enabled`)
      if (data.updated > 0) parts.push(`${data.updated} updated`)
      if (data.deleted > 0) parts.push(`${data.deleted} disabled`)

      setSaveResult({
        success: true,
        message: parts.length ? parts.join(', ') + '.' : 'No changes needed.',
        warnings: data.warnings,
      })
      setIsDirty(false)
      // Reload to sync server state (e.g. newly created copy IDs)
      await load()
    } catch (err) {
      console.error('[CatalogQuestionPicker] save error:', err)
      setSaveResult({ success: false, message: 'An unexpected error occurred.' })
    } finally {
      setSaving(false)
    }
  }

  // Expose isDirty and save() to parent so CreateEventClient can auto-save
  // catalog questions when navigating away from step 3.
  useImperativeHandle(ref, () => ({
    get isDirty() { return isDirty },
    save: async () => { if (isDirty) await handleSave() },
  }))

  // ── Derived ──────────────────────────────────────────────────────────────

  const visibleQuestions = questions.filter((q) => isQuestionVisible(q, registrationMode))

  // Group into ordered categories, skipping empty ones
  const grouped: Array<{ category: string; label: string; items: CatalogQuestion[] }> =
    CATEGORY_ORDER.reduce(
      (acc, cat) => {
        const items = visibleQuestions.filter((q) => q.catalogCategory === cat)
        if (items.length > 0) {
          acc.push({ category: cat, label: CATEGORY_LABELS[cat] ?? cat, items })
        }
        return acc
      },
      [] as Array<{ category: string; label: string; items: CatalogQuestion[] }>
    )

  const enabledCount = Object.values(states).filter((s) => s.enabled).length

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#6B7280]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading question catalog…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Registration Question Catalog</h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Toggle questions on to include them on the registration form.{' '}
            {enabledCount > 0 ? (
              <span className="font-medium text-[#1E3A5F]">{enabledCount} enabled.</span>
            ) : (
              'None enabled yet.'
            )}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {/* Save result banner */}
      {saveResult && (
        <div
          className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
            saveResult.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {saveResult.success ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div>
            <p>{saveResult.message}</p>
            {saveResult.warnings && saveResult.warnings.length > 0 && (
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                {saveResult.warnings.map((w) => (
                  <li key={w.catalogSlug}>
                    <span className="font-medium">{w.catalogSlug}:</span> {w.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Dietary note */}
      {visibleQuestions.some((q) => q.catalogCategory === 'dietary_accessibility') && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <span className="font-medium">Dietary &amp; Accessibility note:</span> The registration
            form already collects free-text dietary and ADA fields. If you enable these catalog
            questions they will appear as <em>supplemental</em> structured fields, labelled
            &ldquo;Additional dietary information&rdquo; to avoid confusion.
          </p>
        </div>
      )}

      {/* Category sections */}
      {grouped.map(({ category, label, items }) => (
        <Card key={category} className="border-[#D1D5DB]">
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4 divide-y divide-[#F3F4F6]">
            {items.map((q) => {
              const state = states[q.catalogSlug] ?? { enabled: false, required: false }
              const serverQ = questions.find((x) => x.catalogSlug === q.catalogSlug)
              const blockedOff = serverQ?.hasAnswers && !state.enabled

              return (
                <div
                  key={q.catalogSlug}
                  className={`flex items-center gap-4 py-3 ${
                    !state.enabled ? 'opacity-60' : ''
                  }`}
                >
                  {/* Enable toggle */}
                  <Switch
                    id={`enable-${q.catalogSlug}`}
                    checked={state.enabled}
                    onCheckedChange={() => {
                      // Prevent disabling a question that has answers
                      if (serverQ?.hasAnswers && state.enabled) return
                      toggleEnabled(q.catalogSlug)
                    }}
                    disabled={serverQ?.hasAnswers && state.enabled}
                    aria-label={`Enable "${q.questionText}"`}
                  />

                  {/* Question text */}
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`enable-${q.catalogSlug}`}
                      className="text-sm font-medium text-[#1E3A5F] cursor-pointer leading-snug"
                    >
                      {q.questionText}
                    </Label>
                    {registrationMode === 'both' && (
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {APPLIES_TO_LABELS[q.appliesTo] ?? q.appliesTo}
                      </p>
                    )}
                    {blockedOff && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Has responses — export data before disabling.
                      </p>
                    )}
                  </div>

                  {/* Type badge */}
                  <span
                    className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      TYPE_BADGE_COLORS[q.questionType] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {TYPE_LABELS[q.questionType] ?? q.questionType}
                  </span>

                  {/* Required checkbox — only editable when question is enabled */}
                  <label
                    className={`flex items-center gap-1.5 text-sm whitespace-nowrap select-none ${
                      state.enabled ? 'text-[#374151] cursor-pointer' : 'text-[#9CA3AF] cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.required}
                      onChange={() => state.enabled && toggleRequired(q.catalogSlug)}
                      disabled={!state.enabled}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                      aria-label={`Mark "${q.questionText}" as required`}
                    />
                    Required
                  </label>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {visibleQuestions.length === 0 && (
        <p className="text-center text-sm text-[#6B7280] py-8">
          No catalog questions available for this registration mode.
        </p>
      )}
    </div>
  )
})

export default CatalogQuestionPicker
