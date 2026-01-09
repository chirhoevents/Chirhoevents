import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

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
            event: true,
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

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Get or create liability form for this participant
    let liabilityForm = participant.liabilityForms[0]

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
    }

    // Send email to parent
    const parentFormUrl = `${process.env.NEXT_PUBLIC_APP_URL}/poros/parent/${liabilityForm.parentToken}`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: parentEmail,
      subject: `Liability Form Required for ${participant.firstName} ${participant.lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E3A5F;">Liability Form Required</h2>
          <p>Hello,</p>
          <p>Your child, <strong>${participant.firstName} ${participant.lastName}</strong>, is registered to attend <strong>${participant.groupRegistration.event.name}</strong>.</p>
          <p>We need you to complete a liability and medical information form before the event.</p>
          <p>
            <a href="${parentFormUrl}" style="display: inline-block; background-color: #9C8466; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Complete Liability Form
            </a>
          </p>
          <p style="color: #6B7280; font-size: 14px;">This link will expire in 30 days.</p>
          <p>If you have any questions, please contact your group leader.</p>
          <p>Thank you,<br>ChiRho Events Team</p>
        </div>
      `,
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
