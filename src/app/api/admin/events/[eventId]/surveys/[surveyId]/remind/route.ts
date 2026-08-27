import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventForMailer, sendSurveyInviteToRecipient } from '@/lib/survey-mailer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; surveyId: string }> }
) {
  try {
    const { eventId, surveyId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Remind Survey]',
    })

    if (error) return error
    if (!user || !effectiveOrgId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, eventId } })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const event = await getEventForMailer(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const customMessage: string | undefined = body?.customMessage

    // Test recipients are never reminded -- they're a one-off preview.
    const nonResponders = await prisma.surveyRecipient.findMany({
      where: { surveyId, sentAt: { not: null }, respondedAt: null, isTest: false },
    })

    const results = { sent: 0, failed: 0, errors: [] as string[] }

    for (const recipient of nonResponders) {
      const outcome = await sendSurveyInviteToRecipient({
        effectiveOrgId,
        eventId,
        event,
        survey,
        recipient,
        customMessage,
        isReminder: true,
        emailType: 'survey_reminder',
      })
      if (outcome.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`Failed to send to ${recipient.email}: ${outcome.error}`)
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Error sending survey reminders:', error)
    return NextResponse.json({ error: 'Failed to send survey reminders' }, { status: 500 })
  }
}
