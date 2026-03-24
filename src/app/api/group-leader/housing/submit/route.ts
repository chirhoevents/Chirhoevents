import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { Resend } from 'resend'
import { wrapEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Verify the group registration belongs to this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        clerkUserId: userId,
        id: eventId,
      },
      include: {
        event: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
              },
            },
          },
        },
        participants: {
          select: { id: true },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { message: 'Group registration not found' },
        { status: 404 }
      )
    }

    // Check if already locked
    if (groupRegistration.housingAssignmentsLocked) {
      return NextResponse.json(
        { message: 'Housing assignments are already submitted' },
        { status: 400 }
      )
    }

    const submittedAt = new Date()

    // Lock the assignments
    await prisma.groupRegistration.update({
      where: { id: groupRegistration.id },
      data: {
        housingAssignmentsLocked: true,
        housingAssignmentsSubmittedAt: submittedAt,
      },
    })

    const event = groupRegistration.event
    const org = event.organization
    const participantCount = groupRegistration.participants.length
    const submittedAtStr = submittedAt.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    // FIX 4.3: Send confirmation email to group leader
    try {
      const leaderEmailHtml = wrapEmail(`
        <h1>Housing Preferences Submitted</h1>
        <p>Hi ${groupRegistration.groupLeaderName},</p>
        <p>Your housing preferences for <strong>${event.name}</strong> have been successfully submitted and locked.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
          <tr><td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666; font-size: 14px;">Group</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${groupRegistration.groupName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666; font-size: 14px;">Participants</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${participantCount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666; font-size: 14px;">Submitted</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E3A5F;">${submittedAtStr}</td>
              </tr>
            </table>
          </td></tr>
        </table>
        <p>The event organizers will review your housing preferences and finalize assignments before the event. You will receive a separate notification once assignments are confirmed.</p>
        <p style="font-size: 14px; color: #666;">If you have questions, please contact ${org.name} at ${org.contactEmail || 'the event organizers'}.</p>
      `, { organizationName: org.name, preheader: `Housing preferences submitted for ${event.name}` })

      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: 'support@chirhoevents.com',
        to: groupRegistration.groupLeaderEmail,
        subject: `Housing Preferences Submitted — ${event.name}`,
        html: leaderEmailHtml,
      })
    } catch (emailErr) {
      console.error('[Housing Submit] Failed to send leader confirmation email:', emailErr)
    }

    // FIX 4.3: Notify org admin
    if (org.contactEmail) {
      try {
        const adminEmailHtml = wrapEmail(`
          <h1>New Housing Submission</h1>
          <p>A group leader has submitted their housing preferences for <strong>${event.name}</strong>.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
            <tr><td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666; font-size: 14px;">Group</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${groupRegistration.groupName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666; font-size: 14px;">Leader</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${groupRegistration.groupLeaderName} (${groupRegistration.groupLeaderEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; color: #666; font-size: 14px;">Participants</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: #1E3A5F;">${participantCount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 14px;">Submitted At</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1E3A5F;">${submittedAtStr}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p>Review housing assignments in your admin dashboard under the Poros portal.</p>
        `, { organizationName: org.name, preheader: `Housing submission from ${groupRegistration.groupName}` })

        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: 'support@chirhoevents.com',
          to: org.contactEmail,
          subject: `[Admin] Housing Submitted — ${groupRegistration.groupName} — ${event.name}`,
          html: adminEmailHtml,
        })
      } catch (adminEmailErr) {
        console.error('[Housing Submit] Failed to send admin notification email:', adminEmailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting housing assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
