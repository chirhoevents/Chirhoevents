import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const recipient = await prisma.surveyRecipient.findUnique({
      where: { token },
      include: {
        survey: {
          include: { questions: { orderBy: { displayOrder: 'asc' } }, event: { select: { name: true } } },
        },
      },
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

    return NextResponse.json({
      survey: {
        id: recipient.survey.id,
        title: recipient.survey.title,
        description: recipient.survey.description,
        isAnonymous: recipient.survey.isAnonymous,
        eventName: recipient.survey.event.name,
      },
      recipientName: recipient.name,
      alreadyResponded: !!recipient.respondedAt,
      questions: recipient.survey.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
        required: q.required,
        displayOrder: q.displayOrder,
      })),
    })
  } catch (error) {
    console.error('Error fetching survey by token:', error)
    return NextResponse.json({ error: 'Failed to load survey' }, { status: 500 })
  }
}
