import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventForMailer, sendSurveyToAudience } from '@/lib/survey-mailer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Send Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, eventId },
      include: { _count: { select: { questions: true } } },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }
    if (survey._count.questions === 0) {
      return NextResponse.json(
        { error: 'Add at least one question before sending this survey' },
        { status: 400 }
      )
    }

    const event = await getEventForMailer(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const customMessage: string | undefined = body?.customMessage

    const results = await sendSurveyToAudience({
      effectiveOrgId,
      eventId,
      survey,
      event,
      customMessage,
    })

    // Sending by hand replaces any pending scheduled send.
    if (survey.scheduledSendMode) {
      await prisma.survey.update({
        where: { id: surveyId },
        data: {
          scheduledSendMode: null,
          scheduledSendAt: null,
          scheduledSendMessage: null,
          scheduledSendClaimedAt: null,
        },
      })
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Error sending survey:', error)
    return NextResponse.json({ error: 'Failed to send survey' }, { status: 500 })
  }
}
