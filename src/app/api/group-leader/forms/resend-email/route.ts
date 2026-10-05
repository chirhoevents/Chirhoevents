import { NextRequest, NextResponse } from 'next/server'
import { POROS_FROM, buildParentLiabilityFormEmail } from '@/lib/poros-email'
import { prisma } from '@/lib/prisma'
import { Resend } from '@/lib/resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { participantId, parentEmail } = await req.json()

    if (!participantId || !parentEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify that this participant belongs to the user's group
    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        groupRegistration: {
          clerkUserId: userId,
        },
      },
      include: {
        groupRegistration: {
          include: {
            event: {
              include: {
                organization: { select: { contactEmail: true } },
                settings: { select: { contactEmail: true } },
              },
            },
          },
        },
        liabilityForms: {
          where: {
            completed: false,
            participantType: 'youth_u18',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const tokenExpiredFor = (form: { parentToken: string | null; parentTokenExpiresAt: Date | null }) =>
      !form.parentToken ||
      (form.parentTokenExpiresAt !== null && form.parentTokenExpiresAt < new Date())

    let liabilityForm
    let firstName: string
    let lastName: string
    let event

    if (participant) {
      firstName = participant.firstName
      lastName = participant.lastName
      event = participant.groupRegistration.event

      // Get or create liability form for this participant
      liabilityForm = participant.liabilityForms[0]

      if (!liabilityForm) {
        // Create a new liability form
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
            parentEmail: parentEmail,
            parentToken: crypto.randomUUID(),
            parentTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            completed: false,
            signatureData: {},
          },
        })
      } else {
        // Persist a corrected email (e.g. fixing a typo) and refresh an expired token
        // so a correction actually sticks instead of only affecting this one send.
        liabilityForm = await prisma.liabilityForm.update({
          where: { id: liabilityForm.id },
          data: {
            parentEmail,
            ...(tokenExpiredFor(liabilityForm)
              ? {
                  parentToken: crypto.randomUUID(),
                  parentTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                }
              : {}),
          },
        })
      }

      // Keep the roster's parent email in sync with what we actually sent to
      if (participant.parentEmail !== parentEmail) {
        await prisma.participant.update({
          where: { id: participant.id },
          data: { parentEmail },
        })
      }
    } else {
      // Not a Participant — the forms list uses the LiabilityForm's own id for
      // teens whose parent hasn't finished step 2 yet (no Participant exists
      // until then), so look the id up as a pending form instead.
      const pendingForm = await prisma.liabilityForm.findFirst({
        where: {
          id: participantId,
          participantId: null,
          completed: false,
          groupRegistration: {
            clerkUserId: userId,
          },
        },
        include: {
          event: {
            include: {
              organization: { select: { contactEmail: true } },
              settings: { select: { contactEmail: true } },
            },
          },
        },
      })

      if (!pendingForm) {
        return NextResponse.json(
          { error: 'Participant not found' },
          { status: 404 }
        )
      }

      firstName = pendingForm.participantFirstName
      lastName = pendingForm.participantLastName
      event = pendingForm.event

      liabilityForm = await prisma.liabilityForm.update({
        where: { id: pendingForm.id },
        data: {
          parentEmail,
          ...(tokenExpiredFor(pendingForm)
            ? {
                parentToken: crypto.randomUUID(),
                parentTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              }
            : {}),
        },
      })
    }

    // Send email to parent
    const parentFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/poros/parent/${liabilityForm.parentToken}`

    const { subject, html } = buildParentLiabilityFormEmail({
      firstName,
      lastName,
      eventName: event.name,
      parentLink: parentFormUrl,
      expiresAt: liabilityForm.parentTokenExpiresAt,
    })

    await resend.emails.send({
      from: POROS_FROM,
      reply_to: resolveReplyTo(event.settings, event.organization),
      to: parentEmail,
      subject,
      html,
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error resending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
