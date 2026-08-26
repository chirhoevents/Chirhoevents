import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'
import { Resend } from 'resend'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupId: string }> }
) {
  try {
    const { eventId, groupId } = await params

    // Verify user has forms.edit permission and event access
    const { error } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Remind Group Leader]'
    )
    if (error) return error

    const group = await prisma.groupRegistration.findUnique({
      where: { id: groupId },
      include: {
        event: {
          include: {
            settings: true,
            organization: { select: { contactEmail: true } },
          },
        },
        liabilityForms: {
          where: {
            completed: false,
            formType: 'youth_u18',
            parentToken: { not: null },
          },
          orderBy: [{ participantLastName: 'asc' }, { participantFirstName: 'asc' }],
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.eventId !== eventId) {
      return NextResponse.json({ error: 'Group does not belong to this event' }, { status: 400 })
    }

    const pendingForms = group.liabilityForms
    if (pendingForms.length === 0) {
      return NextResponse.json(
        { error: 'No teens in this group are currently waiting on a parent.' },
        { status: 400 }
      )
    }

    const teenNames = pendingForms.map(
      (f) => `${f.participantFirstName} ${f.participantLastName}`
    )
    const count = teenNames.length
    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/dashboard/group-leader/forms`
    const replyToAddr = resolveReplyTo(group.event.settings, group.event.organization)

    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: replyToAddr,
      to: group.groupLeaderEmail,
      subject: `ACTION NEEDED: ${count} teen${count === 1 ? '' : 's'} still need${count === 1 ? 's' : ''} a parent to finish their liability form - ${group.groupName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="background-color: #B91C1C; padding: 12px 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
              ⚠️ ${count} LIABILITY FORM${count === 1 ? '' : 'S'} STUCK ON A PARENT
            </p>
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F; margin-top: 0;">Hi ${group.groupLeaderName},</h1>

            <p>
              For <strong>${group.groupName}</strong> at <strong>${group.event.name}</strong>,
              <strong>${count} teen${count === 1 ? '' : 's'}</strong> ${count === 1 ? 'has' : 'have'} completed
              their part of the liability form, but their parent/guardian still needs to finish it before
              they can attend:
            </p>

            <ul style="background-color: #F5F5F5; padding: 20px 20px 20px 40px; border-radius: 8px;">
              ${teenNames.map((name) => `<li style="margin: 4px 0;">${name}</li>`).join('')}
            </ul>

            <p>
              You know these families best — a quick personal nudge (text, call, or in-person) usually gets
              this done faster than another email from us. From your dashboard you can also resend the parent's
              link or fix a mistyped email address for any of them.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardLink}" style="display: inline-block; padding: 15px 30px; background-color: #1E3A5F; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                View & Manage in Your Dashboard
              </a>
            </div>

            <p style="margin-top: 30px;">Pax Christi,<br><strong>ChiRho Events Team</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${group.groupLeaderName} (${group.groupLeaderEmail}) listing ${count} teen${count === 1 ? '' : 's'}.`,
      count,
    })
  } catch (error) {
    console.error('Error sending group leader reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder email' },
      { status: 500 }
    )
  }
}
