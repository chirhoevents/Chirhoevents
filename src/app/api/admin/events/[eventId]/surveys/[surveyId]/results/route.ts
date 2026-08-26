import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

interface QuestionSummary {
  id: string
  questionText: string
  questionType: string
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Survey Results]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, eventId },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const [recipientCount, sentCount, respondedCount, responses] = await Promise.all([
      prisma.surveyRecipient.count({ where: { surveyId } }),
      prisma.surveyRecipient.count({ where: { surveyId, sentAt: { not: null } } }),
      prisma.surveyRecipient.count({ where: { surveyId, respondedAt: { not: null } } }),
      prisma.surveyResponse.findMany({
        where: { surveyId },
        include: {
          answers: true,
          // Never select recipient identity fields when the survey is
          // anonymous -- results must not be able to join a response back
          // to who sent it.
          recipient: survey.isAnonymous
            ? false
            : { select: { name: true, recipientType: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ])

    const questions: QuestionSummary[] = survey.questions.map(q => {
      const answers = responses
        .flatMap(r => r.answers)
        .filter(a => a.questionId === q.id)
        .map(a => a.answerText)
        .filter((a): a is string => a !== null)

      const base: QuestionSummary = {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: (q.options as string[] | null) || null,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
        required: q.required,
        responseCount: answers.length,
      }

      if (q.questionType === 'multiple_choice' || q.questionType === 'yes_no') {
        const counts = new Map<string, number>()
        for (const a of answers) counts.set(a, (counts.get(a) || 0) + 1)
        base.optionCounts = Array.from(counts.entries()).map(([option, count]) => ({ option, count }))
      } else if (q.questionType === 'multi_select') {
        const counts = new Map<string, number>()
        for (const a of answers) {
          let selected: string[] = []
          try {
            selected = JSON.parse(a)
          } catch {
            selected = [a]
          }
          for (const s of selected) counts.set(s, (counts.get(s) || 0) + 1)
        }
        base.optionCounts = Array.from(counts.entries()).map(([option, count]) => ({ option, count }))
      } else if (q.questionType === 'scale') {
        const nums = answers.map(a => Number(a)).filter(n => !Number.isNaN(n))
        base.average = nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : null
        const counts = new Map<number, number>()
        for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1)
        base.scaleCounts = Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value - b.value)
      } else {
        base.textAnswers = answers
      }

      return base
    })

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        isAnonymous: survey.isAnonymous,
        sendToParticipants: survey.sendToParticipants,
        sendToGroupLeaders: survey.sendToGroupLeaders,
      },
      stats: {
        recipientCount,
        sentCount,
        respondedCount,
        responseRate: sentCount > 0 ? respondedCount / sentCount : 0,
      },
      questions,
      // Per-respondent breakdown, only ever available for non-anonymous surveys.
      responses: survey.isAnonymous
        ? null
        : responses.map(r => ({
            id: r.id,
            submittedAt: r.submittedAt,
            recipientName: r.recipient?.name || null,
            recipientType: r.recipient?.recipientType || null,
            answers: r.answers.map(a => ({ questionId: a.questionId, answerText: a.answerText })),
          })),
    })
  } catch (error) {
    console.error('Error fetching survey results:', error)
    return NextResponse.json({ error: 'Failed to fetch survey results' }, { status: 500 })
  }
}
