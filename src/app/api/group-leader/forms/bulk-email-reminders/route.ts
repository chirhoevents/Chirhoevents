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

    const { participantIds } = await req.json()

    if (!participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json(
        { error: 'Invalid participant IDs' },
        { status: 400 }
      )
    }

    // Verify all participants belong to this user's group
    const participants = await prisma.participant.findMany({
      where: {
        id: { in: participantIds },
        groupRegistration: {
          clerkUserId: userId,
        },
        liabilityFormCompleted: false,
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
      },
    })

    if (participants.length === 0) {
      return NextResponse.json(
        { error: 'No pending participants found' },
        { status: 404 }
      )
    }

    // Send reminder emails
    const emailPromises = participants.map(async (participant: any) => {
      // For youth U18, send to parent email
      if (participant.participantType === 'youth_u18' && participant.parentEmail) {
        // Get or create liability form
        let liabilityForm = await prisma.liabilityForm.findFirst({
          where: {
            participantId: participant.id,
            completed: false,
          },
        })

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
              parentTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              completed: false,
              signatureData: {},
            },
          })
        } else if (
          !liabilityForm.parentToken ||
          (liabilityForm.parentTokenExpiresAt !== null && liabilityForm.parentTokenExpiresAt < new Date())
        ) {
          // A reminder with an expired link is a dead end for the parent
          liabilityForm = await prisma.liabilityForm.update({
            where: { id: liabilityForm.id },
            data: {
              parentToken: crypto.randomUUID(),
              parentTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
        }

        const parentFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/poros/parent/${liabilityForm.parentToken}`

        const { subject, html } = buildParentLiabilityFormEmail({
          firstName: participant.firstName,
          lastName: participant.lastName,
          eventName: participant.groupRegistration.event.name,
          parentLink: parentFormUrl,
          expiresAt: liabilityForm.parentTokenExpiresAt,
        })

        return resend.emails.send({
          from: POROS_FROM,
          reply_to: resolveReplyTo(participant.groupRegistration.event.settings, participant.groupRegistration.event.organization),
          to: participant.parentEmail,
          subject,
          html,
        })
      }
    })

    await Promise.all(emailPromises)

    return NextResponse.json({
      success: true,
      message: `Sent ${emailPromises.length} reminder emails`,
      count: emailPromises.length,
    })
  } catch (error) {
    console.error('Error sending bulk reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
