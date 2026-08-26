import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const recipient = await prisma.surveyRecipient.findUnique({
      where: { token },
      include: { survey: { include: { questions: true } } },
    })

    if (!recipient) {
      return NextResponse.json({ error: 'This survey link is invalid.' }, { status: 404 })
    }

    if (recipient.tokenExpiresAt && recipient.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: 'This survey link has expired.' }, { status: 410 })
    }

    if (recipient.survey.status === 'closed') {
      return NextResponse.json({ error: 'This survey is now closed.' }, { status: 410 })
    }

    if (recipient.survey.closesAt && recipient.survey.closesAt < new Date()) {
      return NextResponse.json({ error: 'This survey is now closed.' }, { status: 410 })
    }

    if (recipient.respondedAt) {
      return NextResponse.json({ error: 'You have already submitted this survey.' }, { status: 409 })
    }

    const body = await request.json()
    const answers: { questionId: string; value: unknown }[] = body?.answers || []

    const answersByQuestion = new Map(answers.map(a => [a.questionId, a.value]))

    for (const question of recipient.survey.questions) {
      const value = answersByQuestion.get(question.id)
      const isBlank =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
      if (question.required && isBlank) {
        return NextResponse.json(
          { error: `Please answer: "${question.questionText}"` },
          { status: 400 }
        )
      }
    }

    const answerRows = recipient.survey.questions
      .map(question => {
        const value = answersByQuestion.get(question.id)
        if (value === undefined || value === null) return null
        let answerText: string | null = null
        if (Array.isArray(value)) {
          if (value.length === 0) return null
          answerText = JSON.stringify(value)
        } else if (typeof value === 'number') {
          answerText = String(value)
        } else if (typeof value === 'string') {
          if (value.trim() === '') return null
          answerText = value.trim()
        }
        if (answerText === null) return null
        return { questionId: question.id, answerText }
      })
      .filter((a): a is { questionId: string; answerText: string } => a !== null)

    await prisma.$transaction([
      prisma.surveyResponse.create({
        data: {
          surveyId: recipient.surveyId,
          recipientId: recipient.id,
          answers: { createMany: { data: answerRows } },
        },
      }),
      prisma.surveyRecipient.update({
        where: { id: recipient.id },
        data: { respondedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting survey response:', error)
    return NextResponse.json({ error: 'Failed to submit survey' }, { status: 500 })
  }
}
