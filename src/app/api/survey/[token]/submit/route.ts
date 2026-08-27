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

    // Not a personal link -- fall back to the survey's public (shared)
    // link. Public-link submissions aren't tied to a recipient, so there's
    // no "already responded" check -- it's meant to be used by many people.
    const survey =
      recipient?.survey ||
      (await prisma.survey.findUnique({
        where: { publicToken: token },
        include: { questions: true },
      }))

    if (!survey) {
      return NextResponse.json({ error: 'This survey link is invalid.' }, { status: 404 })
    }

    if (recipient?.tokenExpiresAt && recipient.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: 'This survey link has expired.' }, { status: 410 })
    }

    if (survey.status === 'closed') {
      return NextResponse.json({ error: 'This survey is now closed.' }, { status: 410 })
    }

    if (survey.closesAt && survey.closesAt < new Date()) {
      return NextResponse.json({ error: 'This survey is now closed.' }, { status: 410 })
    }

    if (recipient?.respondedAt) {
      return NextResponse.json({ error: 'You have already submitted this survey.' }, { status: 409 })
    }

    const body = await request.json()
    const answers: { questionId: string; value: unknown }[] = body?.answers || []

    const answersByQuestion = new Map(answers.map(a => [a.questionId, a.value]))

    for (const question of survey.questions) {
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

    const answerRows = survey.questions
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

    const responseData = {
      surveyId: survey.id,
      recipientId: recipient?.id || null,
      answers: { createMany: { data: answerRows } },
    }

    if (recipient) {
      await prisma.$transaction([
        prisma.surveyResponse.create({ data: responseData }),
        prisma.surveyRecipient.update({
          where: { id: recipient.id },
          data: { respondedAt: new Date() },
        }),
      ])
    } else {
      await prisma.surveyResponse.create({ data: responseData })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting survey response:', error)
    return NextResponse.json({ error: 'Failed to submit survey' }, { status: 500 })
  }
}
