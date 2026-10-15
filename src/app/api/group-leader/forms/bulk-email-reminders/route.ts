import { NextRequest, NextResponse } from 'next/server'
import { POROS_FROM, buildParentLiabilityFormEmail } from '@/lib/poros-email'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

const eventInclude = {
  organization: { select: { contactEmail: true } },
  settings: { select: { contactEmail: true } },
} as const

type EventForEmail = {
  name: string
  organization: { contactEmail: string | null } | null
  settings: { contactEmail: string | null } | null
}

type ReminderTarget = {
  formId: string
  parentToken: string | null
  parentTokenExpiresAt: Date | null
  parentEmail: string
  firstName: string
  lastName: string
  event: EventForEmail
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { participantIds } = await req.json()

    if (!participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json(
        { error: 'Invalid participant IDs' },
        { status: 400 }
      )
    }

    // The forms list includes "pending-N" placeholder rows for empty slots.
    // Those aren't UUIDs, and passing them to a uuid column makes Postgres
    // throw, which failed the whole request.
    const ids = participantIds.filter(
      (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id)
    )

    const targets: ReminderTarget[] = []

    // Participants in this user's group who haven't finished their form
    const participants = await prisma.participant.findMany({
      where: {
        id: { in: ids },
        groupRegistration: {
          clerkUserId: userId,
        },
        liabilityFormCompleted: false,
        participantType: 'youth_u18',
        parentEmail: { not: null },
      },
      include: {
        groupRegistration: {
          include: {
            event: { include: eventInclude },
          },
        },
        liabilityForms: {
          where: { completed: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    for (const participant of participants) {
      let liabilityForm = participant.liabilityForms[0]

      if (!liabilityForm) {
        liabilityForm = await prisma.liabilityForm.create({
          data: {
            organizationId: participant.organizationId,
            eventId: participant.groupRegistration.event.id,
            groupRegistrationId: participant.groupRegistrationId,
            participantId: participant.id,
            formType: 'youth_u18',
            participantType: 'youth_u18',
            participantFirstName: participant.firstName,
            participantLastName: participant.lastName,
            participantAge: participant.age,
            participantGender: participant.gender,
            parentEmail: participant.parentEmail,
            parentToken: crypto.randomUUID(),
            parentTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
            completed: false,
            signatureData: {},
          },
        })
      }

      targets.push({
        formId: liabilityForm.id,
        parentToken: liabilityForm.parentToken,
        parentTokenExpiresAt: liabilityForm.parentTokenExpiresAt,
        parentEmail: participant.parentEmail!,
        firstName: participant.firstName,
        lastName: participant.lastName,
        event: participant.groupRegistration.event,
      })
    }

    // Teens whose parent hasn't finished step 2 have no Participant yet — the
    // forms list uses the LiabilityForm's own id for them, so look those up too.
    const pendingForms = await prisma.liabilityForm.findMany({
      where: {
        id: { in: ids },
        participantId: null,
        completed: false,
        formType: 'youth_u18',
        parentEmail: { not: null },
        groupRegistration: {
          is: { clerkUserId: userId },
        },
      },
      include: {
        event: { include: eventInclude },
      },
    })

    for (const form of pendingForms) {
      targets.push({
        formId: form.id,
        parentToken: form.parentToken,
        parentTokenExpiresAt: form.parentTokenExpiresAt,
        parentEmail: form.parentEmail!,
        firstName: form.participantFirstName,
        lastName: form.participantLastName,
        event: form.event,
      })
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'No pending forms with a parent email were found' },
        { status: 404 }
      )
    }

    const results = await Promise.allSettled(
      targets.map(async (target) => {
        let { parentToken, parentTokenExpiresAt } = target

        // A reminder with an expired link is a dead end for the parent
        if (!parentToken || (parentTokenExpiresAt !== null && parentTokenExpiresAt < new Date())) {
          const updated = await prisma.liabilityForm.update({
            where: { id: target.formId },
            data: {
              parentToken: crypto.randomUUID(),
              parentTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
            },
          })
          parentToken = updated.parentToken
          parentTokenExpiresAt = updated.parentTokenExpiresAt
        }

        const parentFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/poros/parent/${parentToken}`

        const { subject, html } = buildParentLiabilityFormEmail({
          firstName: target.firstName,
          lastName: target.lastName,
          eventName: target.event.name,
          parentLink: parentFormUrl,
          expiresAt: parentTokenExpiresAt,
        })

        const { error } = await resend.emails.send({
          from: POROS_FROM,
          reply_to: resolveReplyTo(target.event.settings, target.event.organization),
          to: target.parentEmail,
          subject,
          html,
        })
        if (error) throw new Error(error.message)
      })
    )

    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    failures.forEach((f) => console.error('Error sending bulk reminder:', f.reason))
    const sent = results.length - failures.length

    if (sent === 0) {
      return NextResponse.json(
        { error: 'Failed to send reminders' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} reminder email${sent === 1 ? '' : 's'}`,
      count: sent,
      failed: failures.length,
    })
  } catch (error) {
    console.error('Error sending bulk reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
