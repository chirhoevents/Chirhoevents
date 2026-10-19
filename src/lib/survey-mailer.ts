import { randomUUID } from 'crypto'
import { Resend } from '@/lib/resend'
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
  const supportEmail = resolveReplyTo(event.settings, event.organization)
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

interface Candidate {
  recipientType: 'participant' | 'group_leader' | 'staff'
  participantId?: string
  groupRegistrationId?: string
  individualRegistrationId?: string
  staffRegistrationId?: string
  name: string
  email: string
}

// Survey links are valid for 60 days after a send/reminder — long enough to
// cover a slow-to-respond group leader without leaving links open forever.
const TOKEN_VALID_DAYS = 60

/**
 * Sends a survey to its whole configured audience (participants, group
 * leaders, staff): creates a recipient row for anyone who doesn't have one
 * yet, flips a draft to active, and emails everyone not yet sent a link.
 * Safe to re-run -- people who already got a link are skipped. Used by the
 * "Send Survey" button and by the scheduled-send cron.
 */
export async function sendSurveyToAudience({
  effectiveOrgId,
  eventId,
  survey,
  event,
  customMessage,
}: {
  effectiveOrgId: string
  eventId: string
  survey: SurveyForMailer & {
    status: 'draft' | 'active' | 'closed'
    sendToParticipants: boolean
    sendToGroupLeaders: boolean
    sendToStaff: boolean
  }
  event: EventForMailer
  customMessage?: string
}) {
  const surveyId = survey.id

  // ── Build the candidate recipient list ──────────────────────────────────
  const candidates: Candidate[] = []

  if (survey.sendToGroupLeaders) {
    const groups = await prisma.groupRegistration.findMany({
      where: { eventId, cancelledAt: null },
      select: { id: true, groupLeaderName: true, groupLeaderEmail: true },
    })
    for (const group of groups) {
      candidates.push({
        recipientType: 'group_leader',
        groupRegistrationId: group.id,
        name: group.groupLeaderName,
        email: group.groupLeaderEmail,
      })
    }
  }

  if (survey.sendToParticipants) {
    const participants = await prisma.participant.findMany({
      where: { groupRegistration: { eventId, cancelledAt: null } },
      select: { id: true, firstName: true, lastName: true, email: true, parentEmail: true },
    })
    for (const participant of participants) {
      const email = participant.email || participant.parentEmail
      if (!email) continue // no contactable address (e.g. minor with no email on file)
      candidates.push({
        recipientType: 'participant',
        participantId: participant.id,
        name: `${participant.firstName} ${participant.lastName}`,
        email,
      })
    }

    const individuals = await prisma.individualRegistration.findMany({
      where: { eventId, cancelledAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    for (const individual of individuals) {
      candidates.push({
        recipientType: 'participant',
        individualRegistrationId: individual.id,
        name: `${individual.firstName} ${individual.lastName}`,
        email: individual.email,
      })
    }
  }

  if (survey.sendToStaff) {
    const staffRegistrations = await prisma.staffRegistration.findMany({
      where: { eventId },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    for (const staff of staffRegistrations) {
      candidates.push({
        recipientType: 'staff',
        staffRegistrationId: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        email: staff.email,
      })
    }
  }

  // ── Skip anyone who already has a recipient row for this survey ────────
  const existing = await prisma.surveyRecipient.findMany({
    where: { surveyId },
    select: {
      participantId: true,
      groupRegistrationId: true,
      individualRegistrationId: true,
      staffRegistrationId: true,
    },
  })
  const seenParticipants = new Set(existing.map(r => r.participantId).filter(Boolean))
  const seenGroups = new Set(existing.map(r => r.groupRegistrationId).filter(Boolean))
  const seenIndividuals = new Set(existing.map(r => r.individualRegistrationId).filter(Boolean))
  const seenStaff = new Set(existing.map(r => r.staffRegistrationId).filter(Boolean))

  const newCandidates = candidates.filter(c => {
    if (c.participantId) return !seenParticipants.has(c.participantId)
    if (c.groupRegistrationId) return !seenGroups.has(c.groupRegistrationId)
    if (c.individualRegistrationId) return !seenIndividuals.has(c.individualRegistrationId)
    if (c.staffRegistrationId) return !seenStaff.has(c.staffRegistrationId)
    return true
  })

  const tokenExpiresAt = new Date()
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_VALID_DAYS)

  const newRecipients = newCandidates.map(c => ({
    id: randomUUID(),
    surveyId,
    recipientType: c.recipientType,
    participantId: c.participantId || null,
    groupRegistrationId: c.groupRegistrationId || null,
    individualRegistrationId: c.individualRegistrationId || null,
    staffRegistrationId: c.staffRegistrationId || null,
    name: c.name,
    email: c.email,
    token: randomUUID(),
    tokenExpiresAt,
  }))

  if (newRecipients.length > 0) {
    await prisma.surveyRecipient.createMany({ data: newRecipients })
  }

  if (survey.status === 'draft') {
    await prisma.survey.update({ where: { id: surveyId }, data: { status: 'active' } })
  }

  // ── Email everyone who hasn't been sent a link yet ──────────────────────
  const toSend = await prisma.surveyRecipient.findMany({
    where: { surveyId, sentAt: null, isTest: false },
  })

  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const recipient of toSend) {
    const outcome = await sendSurveyInviteToRecipient({
      effectiveOrgId,
      eventId,
      event,
      survey,
      recipient,
      customMessage,
    })
    if (outcome.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`Failed to send to ${recipient.email}: ${outcome.error}`)
    }
  }

  return { newRecipients: newRecipients.length, ...results }
}
