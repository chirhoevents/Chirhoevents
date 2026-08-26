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

    // Not a personal link -- check whether it's a survey's public (shared)
    // link instead. Those aren't tied to any one respondent.
    const survey =
      recipient?.survey ||
      (await prisma.survey.findUnique({
        where: { publicToken: token },
        include: { questions: { orderBy: { displayOrder: 'asc' } }, event: { select: { name: true } } },
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

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        // The public link is always anonymous -- there's no recipient to
        // link a response back to.
        isAnonymous: survey.isAnonymous || !recipient,
        eventName: survey.event.name,
      },
      recipientName: recipient?.name || null,
      alreadyResponded: !!recipient?.respondedAt,
      questions: survey.questions.map(q => ({
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
