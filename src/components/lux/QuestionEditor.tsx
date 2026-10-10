'use client'

import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button, Select, TextInput, cx } from '@/components/lux/ui'

export interface EditableQuestion {
  id?: string
  key: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'multi_select' | 'dropdown'
  options: string[]
  required: boolean
}

const TYPE_LABELS: Record<EditableQuestion['questionType'], string> = {
  text: 'Short answer',
  yes_no: 'Yes / No',
  dropdown: 'Dropdown',
  multiple_choice: 'Pick one',
  multi_select: 'Pick any',
}

export function newQuestion(): EditableQuestion {
  return { key: Math.random().toString(36).slice(2), questionText: '', questionType: 'text', options: [], required: false }
}

/**
 * "Ask your own questions": a short list editor (question, answer type,
 * choices, required). Used by simple events and programs.
 */
export default function QuestionEditor({ questions, onChange, disabled }: {
  questions: EditableQuestion[]
  onChange: (questions: EditableQuestion[]) => void
  disabled?: boolean
}) {
  const update = (index: number, patch: Partial<EditableQuestion>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  const move = (index: number, delta: number) => {
    const next = [...questions]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-gray-500">No extra questions. Add one if you need to know something else, like meal choice or T-shirt size.</p>
      )}
      {questions.map((q, index) => {
        const needsOptions = ['dropdown', 'multiple_choice', 'multi_select'].includes(q.questionType)
        return (
          <div key={q.key} className="rounded-lg border border-[#E8E2D4] p-3 bg-[#FFFDF8]">
            <div className="flex flex-col md:flex-row gap-2">
              <TextInput
                placeholder="Your question, e.g. Which meal would you like?"
                value={q.questionText}
                onChange={e => update(index, { questionText: e.target.value })}
                disabled={disabled}
                className="flex-1"
              />
              <Select
                value={q.questionType}
                onChange={e => update(index, { questionType: e.target.value as EditableQuestion['questionType'] })}
                disabled={disabled}
                className="md:w-44"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </div>
            {needsOptions && (
              <div className="mt-2">
                <TextInput
                  placeholder="Choices, separated by commas: Fish, Chicken, Vegetarian"
                  value={q.options.join(', ')}
                  onChange={e => update(index, { options: e.target.value.split(',').map(o => o.trimStart()) })}
                  onBlur={e => update(index, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
                  disabled={disabled}
                />
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={e => update(index, { required: e.target.checked })}
                  disabled={disabled}
                  className="rounded border-gray-300"
                />
                Required
              </label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0}
                  className={cx('p-1.5 rounded text-gray-500 hover:bg-gray-100', index === 0 && 'opacity-30')} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={disabled || index === questions.length - 1}
                  className={cx('p-1.5 rounded text-gray-500 hover:bg-gray-100', index === questions.length - 1 && 'opacity-30')} aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onChange(questions.filter((_, i) => i !== index))} disabled={disabled}
                  className="p-1.5 rounded text-red-600 hover:bg-red-50" aria-label="Remove question">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
      <Button variant="secondary" onClick={() => onChange([...questions, newQuestion()])} disabled={disabled}>
        <Plus className="h-4 w-4" /> Add a question
      </Button>
    </div>
  )
}
