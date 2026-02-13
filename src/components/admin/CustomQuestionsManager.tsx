'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Loader2,
  MessageSquare,
} from 'lucide-react'

interface CustomQuestion {
  id: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'dropdown'
  options: string[] | null
  required: boolean
  appliesTo: string
  displayOrder: number
}

interface CustomQuestionsManagerProps {
  eventId: string
  appliesTo: 'staff' | 'vendor'
  getToken: () => Promise<string | null>
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  yes_no: 'Yes/No',
  multiple_choice: 'Multiple Choice',
  dropdown: 'Dropdown',
}

export default function CustomQuestionsManager({
  eventId,
  appliesTo,
  getToken,
}: CustomQuestionsManagerProps) {
  const [questions, setQuestions] = useState<CustomQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null)

  // Form state for the modal
  const [formData, setFormData] = useState({
    questionText: '',
    questionType: 'text' as string,
    required: false,
    options: [''],
  })

  useEffect(() => {
    loadQuestions()
  }, [eventId])

  const loadQuestions = async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await fetch(
        `/api/admin/events/${eventId}/custom-questions?appliesTo=${appliesTo}`,
        { headers }
      )
      if (!response.ok) throw new Error('Failed to fetch questions')
      const data = await response.json()
      // Filter to only show questions for this appliesTo type (and 'all')
      const filtered = (data.questions || []).filter(
        (q: CustomQuestion) => q.appliesTo === appliesTo || q.appliesTo === 'all'
      )
      setQuestions(filtered)
    } catch (err) {
      console.error('Error loading custom questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingQuestion(null)
    setFormData({
      questionText: '',
      questionType: 'text',
      required: false,
      options: [''],
    })
    setModalOpen(true)
  }

  const openEditModal = (question: CustomQuestion) => {
    setEditingQuestion(question)
    setFormData({
      questionText: question.questionText,
      questionType: question.questionType,
      required: question.required,
      options: question.options && question.options.length > 0 ? question.options : [''],
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.questionText.trim()) return

    setSaving(true)
    try {
      const token = await getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const body: Record<string, unknown> = {
        questionText: formData.questionText,
        questionType: formData.questionType,
        required: formData.required,
        appliesTo,
      }

      // Include options for multiple_choice and dropdown
      if (formData.questionType === 'multiple_choice' || formData.questionType === 'dropdown') {
        body.options = formData.options.filter((o) => o.trim() !== '')
      } else {
        body.options = null
      }

      if (editingQuestion) {
        // Update
        const response = await fetch(
          `/api/admin/events/${eventId}/custom-questions/${editingQuestion.id}`,
          { method: 'PUT', headers, body: JSON.stringify(body) }
        )
        if (!response.ok) throw new Error('Failed to update question')
      } else {
        // Create
        const response = await fetch(`/api/admin/events/${eventId}/custom-questions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (!response.ok) throw new Error('Failed to create question')
      }

      setModalOpen(false)
      loadQuestions()
    } catch (err) {
      console.error('Error saving question:', err)
      alert('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? All existing answers will also be deleted.'))
      return

    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await fetch(
        `/api/admin/events/${eventId}/custom-questions/${questionId}`,
        { method: 'DELETE', headers }
      )
      if (!response.ok) throw new Error('Failed to delete question')
      loadQuestions()
    } catch (err) {
      console.error('Error deleting question:', err)
      alert('Failed to delete question')
    }
  }

  const addOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }))
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...formData.options]
    updated[index] = value
    setFormData((prev) => ({ ...prev, options: updated }))
  }

  const removeOption = (index: number) => {
    if (formData.options.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const label = appliesTo === 'staff' ? 'Staff' : 'Vendor'

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#1E3A5F]" />
              <CardTitle className="text-lg">Custom {label} Questions</CardTitle>
            </div>
            <Button size="sm" onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-1" />
              Add Question
            </Button>
          </div>
          <p className="text-sm text-[#6B7280]">
            Add custom questions that {appliesTo === 'staff' ? 'staff members' : 'vendors'} must
            answer during registration.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-center text-[#6B7280] py-4">
              No custom questions configured. Click &quot;Add Question&quot; to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-[#6B7280] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        {question.questionText}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {QUESTION_TYPE_LABELS[question.questionType] || question.questionType}
                        </Badge>
                        {question.appliesTo === 'all' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            All types
                          </Badge>
                        )}
                        {question.options && question.options.length > 0 && (
                          <span className="text-xs text-[#6B7280]">
                            {question.options.length} options
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(question)}
                      title="Edit question"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(question.id)}
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Question Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add Custom Question'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="questionText">Question Text</Label>
              <Input
                id="questionText"
                value={formData.questionText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, questionText: e.target.value }))
                }
                placeholder="e.g., Do you have any allergies?"
              />
            </div>

            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <select
                id="questionType"
                value={formData.questionType}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, questionType: e.target.value }))
                }
                className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="text">Text (free-form answer)</option>
                <option value="yes_no">Yes/No</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>

            {/* Options for multiple_choice and dropdown */}
            {(formData.questionType === 'multiple_choice' ||
              formData.questionType === 'dropdown') && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2 mt-1">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {formData.options.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, required: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required (registrant must answer this question)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.questionText.trim()}
              className="bg-[#1E3A5F] hover:bg-[#2d4a6f]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingQuestion ? (
                'Update Question'
              ) : (
                'Add Question'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
