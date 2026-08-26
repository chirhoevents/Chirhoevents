import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventForMailer, sendSurveyInviteToRecipient } from '@/lib/survey-mailer'

const TOKEN_VALID_DAYS = 60
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Add a one-off recipient not pulled from any registration -- a vendor, a
// staff member, anyone the organizer wants to survey by hand -- and email
// them a real tracked link right away.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Add Survey Recipient]',
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

    const body = await request.json().catch(() => ({}))
    const name: string | undefined = body?.name
    const email: string | undefined = body?.email?.trim()
    const customMessage: string | undefined = body?.customMessage

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const event = await getEventForMailer(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_VALID_DAYS)

    const recipient = await prisma.surveyRecipient.create({
      data: {
        id: randomUUID(),
        surveyId,
        recipientType: 'manual',
        name: name?.trim() || null,
        email,
        token: randomUUID(),
        tokenExpiresAt,
      },
    })

    if (survey.status === 'draft') {
      await prisma.survey.update({ where: { id: surveyId }, data: { status: 'active' } })
    }

    const outcome = await sendSurveyInviteToRecipient({
      effectiveOrgId,
      eventId,
      event,
      survey,
      recipient,
      customMessage,
    })

    if (!outcome.success) {
      return NextResponse.json(
        { error: `Recipient added, but the email failed to send: ${outcome.error}`, recipient },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, recipient }, { status: 201 })
  } catch (error) {
    console.error('Error adding survey recipient:', error)
    return NextResponse.json({ error: 'Failed to add recipient' }, { status: 500 })
  }
}
