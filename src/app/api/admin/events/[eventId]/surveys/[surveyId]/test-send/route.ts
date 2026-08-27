import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventForMailer, sendSurveyInviteToRecipient } from '@/lib/survey-mailer'

const TOKEN_VALID_DAYS = 60
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Send a real, submittable preview link to any address (typically the
// admin's own inbox) so they can try the survey before activating it.
// Test recipients are excluded from recipient/response counts and results.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Survey Test Send]',
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
        { error: 'Add at least one question before sending a test' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const email: string | undefined = body?.email?.trim()

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const event = await getEventForMailer(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Re-use the existing test recipient for this address (if any) so
    // repeat test sends reuse the same link instead of piling up rows.
    let recipient = await prisma.surveyRecipient.findFirst({
      where: { surveyId, email, isTest: true },
    })

    const tokenExpiresAt = new Date()
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_VALID_DAYS)

    if (!recipient) {
      recipient = await prisma.surveyRecipient.create({
        data: {
          id: randomUUID(),
          surveyId,
          recipientType: 'manual',
          isTest: true,
          name: 'Test',
          email,
          token: randomUUID(),
          tokenExpiresAt,
        },
      })
    } else {
      // Let the tester submit again on a re-send.
      recipient = await prisma.surveyRecipient.update({
        where: { id: recipient.id },
        data: { respondedAt: null, tokenExpiresAt },
      })
      await prisma.surveyResponse.deleteMany({ where: { recipientId: recipient.id } })
    }

    const outcome = await sendSurveyInviteToRecipient({
      effectiveOrgId,
      eventId,
      event,
      survey,
      recipient,
      emailType: 'survey_test',
    })

    if (!outcome.success) {
      return NextResponse.json({ error: `Failed to send test: ${outcome.error}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending survey test:', error)
    return NextResponse.json({ error: 'Failed to send test' }, { status: 500 })
  }
}
