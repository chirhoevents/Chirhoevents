import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { generateSurveyInviteEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EventForMailer {
  id: string
  name: string
  settings: { contactEmail: string | null } | null
  organization: { name: string; contactEmail: string | null }
}

interface RecipientForMailer {
  id: string
  name: string | null
  email: string
  token: string
  recipientType: 'participant' | 'group_leader' | 'staff' | 'manual'
}

interface SurveyForMailer {
  id: string
  title: string
  isAnonymous: boolean
}

/**
 * Sends (or re-sends) a survey invite to a single recipient, marks it sent,
 * and logs the email. Shared by the bulk send/remind routes and the
 * single-recipient add/test-send routes so the Resend call, subject line,
 * and EmailLog bookkeeping only live in one place.
 */
export async function sendSurveyInviteToRecipient({
  effectiveOrgId,
  eventId,
  event,
  survey,
  recipient,
  customMessage,
  isReminder = false,
  emailType = 'survey_invite',
}: {
  effectiveOrgId: string
  eventId: string
  event: EventForMailer
  survey: SurveyForMailer
  recipient: RecipientForMailer
  customMessage?: string
  isReminder?: boolean
  emailType?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
  const surveyUrl = `${appUrl}/survey/${recipient.token}`
  const orgName = event.organization.name
  const supportEmail = event.organization.contactEmail || 'support@chirhoevents.com'
  const subject = isReminder
    ? `Reminder: We'd love your feedback on ${event.name}`
    : `We'd love your feedback on ${event.name}`

  const html = generateSurveyInviteEmail({
    recipientName: recipient.name || 'there',
    eventName: event.name,
    surveyTitle: survey.title,
    surveyUrl,
    isReminder,
    isAnonymous: survey.isAnonymous,
    isGroupLeader: recipient.recipientType === 'group_leader',
    isStaff: recipient.recipientType === 'staff',
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
      data: isReminder
        ? { remindersSentCount: { increment: 1 }, lastReminderAt: new Date() }
        : { sentAt: new Date() },
    })

    await logEmail({
      organizationId: effectiveOrgId,
      eventId,
      recipientEmail: recipient.email,
      recipientName: recipient.name || undefined,
      emailType,
      subject,
      htmlContent: html,
      metadata: { surveyId: survey.id, recipientType: recipient.recipientType },
    })

    return { success: true }
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : 'Unknown error'
    await logEmailFailure(
      {
        organizationId: effectiveOrgId,
        eventId,
        recipientEmail: recipient.email,
        recipientName: recipient.name || undefined,
        emailType,
        subject,
        htmlContent: '',
      },
      message
    )
    return { success: false, error: message }
  }
}

export async function getEventForMailer(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      settings: { select: { contactEmail: true } },
      organization: { select: { name: true, contactEmail: true } },
    },
  })
}
