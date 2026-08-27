'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Users, UserCheck, EyeOff } from 'lucide-react'
import { format } from 'date-fns'

interface Stats {
  recipientCount: number
  sentCount: number
  respondedCount: number
  responseRate: number
}

interface QuestionResult {
  id: string
  questionText: string
  questionType: 'text' | 'yes_no' | 'multiple_choice' | 'multi_select' | 'scale'
  options: string[] | null
  scaleMin: number | null
  scaleMax: number | null
  scaleMinLabel: string | null
  scaleMaxLabel: string | null
  required: boolean
  responseCount: number
  optionCounts?: { option: string; count: number }[]
  average?: number | null
  scaleCounts?: { value: number; count: number }[]
  textAnswers?: string[]
}

interface ResultsResponse {
  survey: {
    id: string
    title: string
    status: string
    isAnonymous: boolean
    sendToParticipants: boolean
    sendToGroupLeaders: boolean
  }
  stats: Stats
  questions: QuestionResult[]
  responses: {
    id: string
    submittedAt: string
    recipientName: string | null
    recipientType: string | null
    answers: { questionId: string; answerText: string | null }[]
  }[] | null
}

interface SurveyResultsClientProps {
  eventId: string
  eventName: string
  surveyId: string
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#1E3A5F]">{label}</span>
        <span className="text-[#6B7280]">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className="bg-[#1E3A5F] h-2.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function SurveyResultsClient({ eventId, eventName, surveyId }: SurveyResultsClientProps) {
  const { getToken } = useAuth()
  const [data, setData] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadResults = useCallback(async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/results`, { headers })
      if (!res.ok) throw new Error('Failed to load results')
      setData(await res.json())
    } catch (err) {
      console.error('Error loading survey results:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId, getToken, surveyId])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-600">Failed to load results</p>
      </div>
    )
  }

  const { survey, stats, questions, responses } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/admin/events/${eventId}/surveys/${surveyId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Survey
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">{survey.title} — Results</h1>
          <p className="text-sm text-[#6B7280]">{eventName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
              <Users className="h-4 w-4" /> Recipients
            </div>
            <p className="text-2xl font-bold text-[#1E3A5F]">{stats.recipientCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">Sent</div>
            <p className="text-2xl font-bold text-[#1E3A5F]">{stats.sentCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
              <UserCheck className="h-4 w-4" /> Responded
            </div>
            <p className="text-2xl font-bold text-[#1E3A5F]">{stats.respondedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">Response Rate</div>
            <p className="text-2xl font-bold text-[#1E3A5F]">{Math.round(stats.responseRate * 100)}%</p>
          </CardContent>
        </Card>
      </div>

      {survey.isAnonymous && (
        <div className="flex items-center gap-2 text-sm text-[#6B7280] bg-gray-50 border border-gray-200 rounded-md px-4 py-2">
          <EyeOff className="h-4 w-4" />
          This survey is anonymous — responses below are not linked to any respondent.
        </div>
      )}

      {questions.length === 0 ? (
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-8 text-center text-[#6B7280]">
            This survey has no questions yet.
          </CardContent>
        </Card>
      ) : (
        questions.map((q, index) => (
          <Card key={q.id} className="bg-white border-[#D1D5DB]">
            <CardHeader>
              <CardTitle className="text-base text-[#1E3A5F]">
                {index + 1}. {q.questionText}
              </CardTitle>
              <p className="text-xs text-[#6B7280]">{q.responseCount} response{q.responseCount === 1 ? '' : 's'}</p>
            </CardHeader>
            <CardContent>
              {(q.questionType === 'multiple_choice' || q.questionType === 'yes_no' || q.questionType === 'multi_select') && (
                <div className="space-y-3">
                  {(q.optionCounts && q.optionCounts.length > 0 ? q.optionCounts : []).map(oc => (
                    <BarRow
                      key={oc.option}
                      label={oc.option}
                      count={oc.count}
                      max={Math.max(...(q.optionCounts || []).map(o => o.count), 1)}
                    />
                  ))}
                  {(!q.optionCounts || q.optionCounts.length === 0) && (
                    <p className="text-sm text-[#6B7280]">No responses yet.</p>
                  )}
                </div>
              )}

              {q.questionType === 'scale' && (
                <div className="space-y-3">
                  {q.average !== null && q.average !== undefined && (
                    <p className="text-3xl font-bold text-[#1E3A5F]">
                      {q.average.toFixed(1)}{' '}
                      <span className="text-base font-normal text-[#6B7280]">average</span>
                    </p>
                  )}
                  {(q.scaleCounts || []).map(sc => (
                    <BarRow
                      key={sc.value}
                      label={String(sc.value)}
                      count={sc.count}
                      max={Math.max(...(q.scaleCounts || []).map(s => s.count), 1)}
                    />
                  ))}
                  {(!q.scaleCounts || q.scaleCounts.length === 0) && (
                    <p className="text-sm text-[#6B7280]">No responses yet.</p>
                  )}
                </div>
              )}

              {q.questionType === 'text' && (
                <div className="space-y-2">
                  {q.textAnswers && q.textAnswers.length > 0 ? (
                    q.textAnswers.map((answer, i) => (
                      <p key={i} className="text-sm text-[#1E3A5F] bg-gray-50 rounded-md px-3 py-2">
                        &ldquo;{answer}&rdquo;
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-[#6B7280]">No responses yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {responses && responses.length > 0 && (
        <Card className="bg-white border-[#D1D5DB]">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F]">Responses by Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {responses.map(r => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#1E3A5F]">
                      {r.recipientName || (r.recipientType ? 'Unknown' : 'Public Link')}
                    </p>
                    {r.recipientType ? (
                      <Badge variant="outline" className="text-xs">
                        {r.recipientType === 'group_leader'
                          ? 'Group Leader'
                          : r.recipientType === 'staff'
                            ? 'Staff/Volunteer'
                            : r.recipientType === 'manual'
                              ? 'Manually Added'
                              : 'Participant'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Public Link
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-[#6B7280]">
                    {format(new Date(r.submittedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="space-y-1">
                  {r.answers.map(a => {
                    const question = questions.find(q => q.id === a.questionId)
                    return (
                      <p key={a.questionId} className="text-xs text-[#6B7280]">
                        <span className="text-[#1E3A5F]">{question?.questionText}:</span>{' '}
                        {a.answerText}
                      </p>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
