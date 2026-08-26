import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { generateSurveyInviteEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        settings: { select: { contactEmail: true } },
        organization: { select: { name: true, contactEmail: true } },
      },
    })
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const customMessage: string | undefined = body?.customMessage

    const nonResponders = await prisma.surveyRecipient.findMany({
      where: { surveyId, sentAt: { not: null }, respondedAt: null },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const orgName = event.organization.name
    const supportEmail = event.organization.contactEmail || 'support@chirhoevents.com'
    const subject = `Reminder: We'd love your feedback on ${event.name}`
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    for (const recipient of nonResponders) {
      const surveyUrl = `${appUrl}/survey/${recipient.token}`
      const html = generateSurveyInviteEmail({
        recipientName: recipient.name || 'there',
        eventName: event.name,
        surveyTitle: survey.title,
        surveyUrl,
        isReminder: true,
        isAnonymous: survey.isAnonymous,
        isGroupLeader: recipient.recipientType === 'group_leader',
        customMessage,
        organizationName: orgName,
        supportEmail,
      })

      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: resolveReplyTo(event.settings, event.organization),
          to: recipient.email,
          subject,
          html,
        })

        await prisma.surveyRecipient.update({
          where: { id: recipient.id },
          data: { remindersSentCount: { increment: 1 }, lastReminderAt: new Date() },
        })

        await logEmail({
          organizationId: effectiveOrgId,
          eventId,
          recipientEmail: recipient.email,
          recipientName: recipient.name || undefined,
          emailType: 'survey_reminder',
          subject,
          htmlContent: html,
          metadata: { surveyId, recipientType: recipient.recipientType },
        })

        results.sent++
      } catch (sendError) {
        results.failed++
        const message = sendError instanceof Error ? sendError.message : 'Unknown error'
        results.errors.push(`Failed to send to ${recipient.email}: ${message}`)
        await logEmailFailure(
          {
            organizationId: effectiveOrgId,
            eventId,
            recipientEmail: recipient.email,
            recipientName: recipient.name || undefined,
            emailType: 'survey_reminder',
            subject,
            htmlContent: '',
          },
          message
        )
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Error sending survey reminders:', error)
    return NextResponse.json({ error: 'Failed to send survey reminders' }, { status: 500 })
  }
}
