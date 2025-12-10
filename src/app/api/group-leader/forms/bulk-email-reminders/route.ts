import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()

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
            event: true,
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
    const emailPromises = participants.map(async (participant) => {
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
        }

        const parentFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/poros/parent/${liabilityForm.parentToken}`

        return resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: participant.parentEmail,
          subject: `Reminder: Liability Form Required for ${participant.firstName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1E3A5F;">Reminder: Liability Form Required</h2>
              <p>Hello,</p>
              <p>This is a friendly reminder that we still need you to complete the liability form for <strong>${participant.firstName} ${participant.lastName}</strong> for <strong>${participant.groupRegistration.event.name}</strong>.</p>
              <p>
                <a href="${parentFormUrl}" style="display: inline-block; background-color: #9C8466; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Complete Form Now
                </a>
              </p>
              <p style="color: #6B7280; font-size: 14px;">Please complete this form as soon as possible to ensure your child can participate in the event.</p>
              <p>Thank you,<br>ChiRho Events Team</p>
            </div>
          `,
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
