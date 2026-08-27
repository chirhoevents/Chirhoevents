import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { getEventForMailer, sendSurveyInviteToRecipient } from '@/lib/survey-mailer'

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

    return NextResponse.json({
      success: true,
      newRecipients: newRecipients.length,
      ...results,
    })
  } catch (error) {
    console.error('Error sending survey:', error)
    return NextResponse.json({ error: 'Failed to send survey' }, { status: 500 })
  }
}
