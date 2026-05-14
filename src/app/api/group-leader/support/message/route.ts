import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/group-leader/support/message - Send support message
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subject, message, includeContactInfo } = body

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      )
    }

    // Get the group registration for this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        event: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    const orgEmail = groupRegistration.event.organization.contactEmail
    const leaderEmail = groupRegistration.groupLeaderEmail
    const leaderName = groupRegistration.groupLeaderName
    const groupName = groupRegistration.groupName
    const eventName = groupRegistration.event.name

    // Send message to the event organizer
    const toOrgResult = await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      to: orgEmail,
      reply_to: leaderEmail,
      subject: `Support message from ${leaderName} — ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1E3A5F; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Group Leader Support Message</h1>
          </div>

          <div style="padding: 30px 20px;">
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>From:</strong> ${leaderName} &lt;${leaderEmail}&gt;</p>
              <p style="margin: 5px 0;"><strong>Group / Parish:</strong> ${groupName}</p>
              <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
            </div>

            <div style="background-color: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1E3A5F; margin-top: 0; font-size: 16px;">Subject: ${subject}</h2>
              <p style="white-space: pre-wrap; color: #333;">${message}</p>
            </div>

            ${includeContactInfo ? `
            <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #1E3A5F;">
                <strong>Reply directly to this email</strong> to respond to the group leader at ${leaderEmail}.
              </p>
            </div>
            ` : ''}

            <p style="font-size: 12px; color: #888; margin-top: 30px;">
              Sent via ChiRho Events group leader portal
            </p>
          </div>
        </div>
      `,
    })

    if (toOrgResult.error) {
      console.error('Failed to send support message to org:', toOrgResult.error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send message. Please try again or email ${orgEmail} directly.`,
        },
        { status: 500 }
      )
    }

    // Send confirmation to the group leader
    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: 'support@chirhoevents.com',
      to: leaderEmail,
      subject: `Your message has been sent — ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1E3A5F; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Message Sent</h1>
          </div>

          <div style="padding: 30px 20px;">
            <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin-bottom: 20px; border-radius: 4px;">
              <p style="color: #155724; margin: 0;">
                ✓ Your message has been sent to the event organizer for <strong>${eventName}</strong>.
                They&apos;ll respond to <strong>${leaderEmail}</strong>.
              </p>
            </div>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;"><strong>Your message:</strong></p>
              <p style="margin: 0; font-size: 14px; color: #333; white-space: pre-wrap;">${message}</p>
            </div>

            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              If you need immediate assistance, contact us directly at ${orgEmail}.
            </p>
          </div>
        </div>
      `,
    }).catch((err) => {
      // Confirmation email failure is non-critical — the main message was already sent
      console.error('Failed to send support message confirmation to leader:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent to the event organizers.',
    })
  } catch (error) {
    console.error('Error sending support message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
