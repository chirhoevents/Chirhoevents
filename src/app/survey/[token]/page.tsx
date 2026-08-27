'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Question {
  id: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'multi_select' | 'scale'
  options: string[] | null
  scaleMin: number | null
  scaleMax: number | null
  scaleMinLabel: string | null
  scaleMaxLabel: string | null
  required: boolean
  displayOrder: number
}

interface SurveyData {
  survey: {
    id: string
    title: string
    description: string | null
    isAnonymous: boolean
    eventName: string
  }
  recipientName: string | null
  alreadyResponded: boolean
  questions: Question[]
}

type AnswerValue = string | string[] | number | undefined

export default function SurveyPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SurveyData | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSurvey() {
      try {
        const res = await fetch(`/api/survey/${token}`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'This survey link is invalid.')
        }
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey')
      } finally {
        setLoading(false)
      }
    }
    if (token) loadSurvey()
  }, [token])

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiSelect = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : []
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option]
      return { ...prev, [questionId]: next }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)

    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
      }
      const res = await fetch(`/api/survey/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit survey')
      }
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit survey')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
          <p className="text-navy font-medium">Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Can&apos;t Open This Survey</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  if (submitted || data.alreadyResponded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Thank You!</h2>
          <p className="text-gray-600">
            {submitted
              ? 'Your response has been recorded.'
              : 'You have already submitted this survey — thanks again for your feedback.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-navy px-6 py-6 sm:px-8">
            <p className="text-gold font-semibold text-sm mb-1">{data.survey.eventName}</p>
            <h1 className="text-2xl font-bold text-white">{data.survey.title}</h1>
            {data.survey.description && (
              <p className="text-gray-200 mt-2 text-sm">{data.survey.description}</p>
            )}
            {data.survey.isAnonymous && (
              <p className="text-gray-300 mt-3 text-xs uppercase tracking-wide">
                This survey is anonymous
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-8 space-y-8">
            {data.recipientName && !data.survey.isAnonymous && (
              <p className="text-gray-500 text-sm">Hi {data.recipientName.split(' ')[0]}, thanks for taking a moment for this.</p>
            )}

            {data.questions.map((question, index) => (
              <div key={question.id}>
                <label className="block font-semibold text-navy mb-3">
                  {index + 1}. {question.questionText}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {question.questionType === 'text' && (
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                    rows={3}
                    value={(answers[question.id] as string) || ''}
                    onChange={e => setAnswer(question.id, e.target.value)}
                  />
                )}

                {question.questionType === 'yes_no' && (
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(question.id, opt)}
                        className={`px-5 py-2 rounded-md border font-medium transition-colors ${
                          answers[question.id] === opt
                            ? 'bg-navy text-white border-navy'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-navy'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {question.questionType === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(question.options || []).map(opt => (
                      <label
                        key={opt}
                        className="flex items-center gap-3 border border-gray-300 rounded-md px-3 py-2 cursor-pointer hover:border-navy"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === opt}
                          onChange={() => setAnswer(question.id, opt)}
                          className="h-4 w-4"
                          style={{ accentColor: '#1E3A5F' }}
                        />
                        <span className="text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.questionType === 'multi_select' && (
                  <div className="space-y-2">
                    {(question.options || []).map(opt => {
                      const selected = Array.isArray(answers[question.id])
                        ? (answers[question.id] as string[]).includes(opt)
                        : false
                      return (
                        <label
                          key={opt}
                          className="flex items-center gap-3 border border-gray-300 rounded-md px-3 py-2 cursor-pointer hover:border-navy"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMultiSelect(question.id, opt)}
                            className="h-4 w-4"
                            style={{ accentColor: '#1E3A5F' }}
                          />
                          <span className="text-gray-700">{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {question.questionType === 'scale' && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>{question.scaleMinLabel || question.scaleMin}</span>
                      <span>{question.scaleMaxLabel || question.scaleMax}</span>
                    </div>
                    <div className="flex gap-2">
                      {Array.from(
                        { length: (question.scaleMax || 5) - (question.scaleMin || 1) + 1 },
                        (_, i) => (question.scaleMin || 1) + i
                      ).map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAnswer(question.id, value)}
                          className={`flex-1 h-10 rounded-md border font-semibold transition-colors ${
                            answers[question.id] === value
                              ? 'bg-navy text-white border-navy'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-navy'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy text-white py-3 rounded-md font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
