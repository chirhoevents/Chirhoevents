'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomQuestion {
  id: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'dropdown' | 'multi_select'
  options: string[] | null
  required: boolean
  appliesTo: string
  displayOrder: number
}

// Answers map: questionId → answerText (string or JSON array string for multi_select)
export type CustomAnswersMap = Record<string, string>

interface Props {
  question: CustomQuestion
  answers: CustomAnswersMap
  onChange: (questionId: string, value: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse multi_select answer stored as JSON array string, e.g. '["A","B"]' */
function parseMultiSelectValue(raw: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Serialise multi_select selections to JSON array string */
function serializeMultiSelectValue(selections: string[]): string {
  return JSON.stringify(selections)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomQuestionRenderer({ question, answers, onChange }: Props) {
  const value = answers[question.id] || ''
  const inputId = `cq-${question.id}`

  const labelEl = (
    <Label htmlFor={inputId} className="text-sm font-medium text-navy">
      {question.questionText}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  )

  // ── text ──────────────────────────────────────────────────────────────────
  if (question.questionType === 'text') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          required={question.required}
          rows={2}
          className="resize-none"
        />
      </div>
    )
  }

  // ── yes_no ────────────────────────────────────────────────────────────────
  if (question.questionType === 'yes_no') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          required={question.required}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">Select…</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
    )
  }

  // ── dropdown / multiple_choice ────────────────────────────────────────────
  if (question.questionType === 'dropdown' || question.questionType === 'multiple_choice') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          required={question.required}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">Select…</option>
          {question.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // ── multi_select (checkboxes) ─────────────────────────────────────────────
  if (question.questionType === 'multi_select') {
    const selected = parseMultiSelectValue(value)

    function handleCheck(opt: string, checked: boolean) {
      const next = checked ? [...selected, opt] : selected.filter((s) => s !== opt)
      onChange(question.id, serializeMultiSelectValue(next))
    }

    return (
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-navy">
          {question.questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </legend>
        <div className="space-y-1.5 pt-1">
          {question.options?.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => handleCheck(opt, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return null
}
