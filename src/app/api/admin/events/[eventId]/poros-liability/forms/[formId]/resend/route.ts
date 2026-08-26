import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsEditAccess } from '@/lib/api-auth'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const { eventId, formId } = await params

    // Verify user has forms.edit permission and event access
    const { error } = await verifyFormsEditAccess(
      request,
      eventId,
      '[Poros Liability Resend Parent Email]'
    )
    if (error) return error

    // Optional body: { parentEmail } to correct a typo'd parent address before resending
    let overrideParentEmail: string | null = null
    try {
      const body = await request.json()
      if (typeof body?.parentEmail === 'string' && body.parentEmail.trim()) {
        overrideParentEmail = body.parentEmail.trim()
      }
    } catch {
      // No JSON body sent — fine, just resend as-is
    }

    const form = await prisma.liabilityForm.findUnique({
      where: { id: formId },
      include: {
        event: {
          include: {
            settings: true,
            organization: { select: { contactEmail: true } },
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (form.eventId !== eventId) {
      return NextResponse.json({ error: 'Form does not belong to this event' }, { status: 400 })
    }

    if (form.completed) {
      return NextResponse.json({ error: 'This form has already been completed' }, { status: 400 })
    }

    if (form.formType !== 'youth_u18') {
      return NextResponse.json({ error: 'This form is not a youth under-18 form' }, { status: 400 })
    }

    const targetParentEmail = overrideParentEmail || form.parentEmail
    if (!targetParentEmail) {
      return NextResponse.json(
        { error: 'No parent email on file. Provide one to send the form.' },
        { status: 400 }
      )
    }

    const tokenExpired = !form.parentToken || (form.parentTokenExpiresAt !== null && form.parentTokenExpiresAt < new Date())
    const parentToken = tokenExpired ? randomUUID() : form.parentToken!
    const parentTokenExpiresAt = tokenExpired
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : form.parentTokenExpiresAt

    await prisma.liabilityForm.update({
      where: { id: form.id },
      data: {
        parentEmail: targetParentEmail,
        ...(tokenExpired ? { parentToken, parentTokenExpiresAt } : {}),
      },
    })

    // Keep the group roster's parent email in sync, if this belongs to a group participant
    if (form.participantId) {
      await prisma.participant.update({
        where: { id: form.participantId },
        data: { parentEmail: targetParentEmail },
      }).catch(() => {})
    }

    const parentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/parent/${parentToken}`
    const replyToAddr = resolveReplyTo(form.event.settings, form.event.organization)

    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: replyToAddr,
      to: targetParentEmail,
      subject: `ACTION REQUIRED: Complete ${form.participantFirstName} ${form.participantLastName}'s liability form - ${form.event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="background-color: #B91C1C; padding: 12px 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
              ⚠️ REMINDER — REGISTRATION IS NOT COMPLETE
            </p>
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F; margin-top: 0;">Complete ${form.participantFirstName}'s Liability Form</h1>

            <p>Hi,</p>

            <p>
              <strong>${form.participantFirstName} ${form.participantLastName}</strong> is registered for
              <strong>${form.event.name}</strong>, but <strong>they cannot attend until you complete
              and sign their liability form</strong>. As their parent/guardian, only you can complete this step.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${parentLink}" style="display: inline-block; padding: 15px 30px; background-color: #B91C1C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Complete Form Now (Takes ~5 Minutes)
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${parentLink}" style="color: #1E3A5F;">${parentLink}</a>
            </p>

            <div style="background-color: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                This link expires in 7 days. If it expires before you complete the form, contact us for a new one.
              </p>
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
      message: `Reminder sent to parent (${targetParentEmail})`,
      parentEmail: targetParentEmail,
    })
  } catch (error) {
    console.error('Error resending parent email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
