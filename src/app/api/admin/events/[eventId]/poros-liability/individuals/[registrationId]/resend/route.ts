import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { resolveReplyTo } from '@/lib/email-reply-to'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  try {
    const { eventId, registrationId } = await params

    // Verify user has forms.view permission and event access
    const { error } = await verifyFormsViewAccess(
      request,
      eventId,
      '[Individual Resend Email]'
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

    // Fetch the individual registration with event info and its latest liability form
    const registration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          include: {
            settings: true,
            organization: { select: { contactEmail: true } },
          },
        },
        liabilityForms: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Check if event ID matches
    if (registration.eventId !== eventId) {
      return NextResponse.json({ error: 'Registration does not belong to this event' }, { status: 400 })
    }

    // Check if liability forms are required
    if (!registration.event.settings?.liabilityFormsRequiredIndividual) {
      return NextResponse.json({ error: 'Liability forms are not required for this event' }, { status: 400 })
    }

    const isUnder18 = registration.age !== null && registration.age < 18
    const replyToAddr = resolveReplyTo(registration.event.settings, registration.event.organization)
    const form = registration.liabilityForms[0]

    // Step 1 (basic info) is already done and we're waiting on the parent to
    // finish step 2 — resend directly to the parent, not the registrant.
    if (isUnder18 && form && !form.completed && (form.parentToken || overrideParentEmail)) {
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

      const parentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/parent/${parentToken}`

      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: replyToAddr,
        to: targetParentEmail,
        subject: `ACTION REQUIRED: Complete ${registration.firstName} ${registration.lastName}'s liability form - ${registration.event.name}`,
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
              <h1 style="color: #1E3A5F; margin-top: 0;">Complete ${registration.firstName}'s Liability Form</h1>

              <p>Hi,</p>

              <p>
                <strong>${registration.firstName} ${registration.lastName}</strong> is registered for
                <strong>${registration.event.name}</strong>, but <strong>they cannot attend until you complete
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
    }

    // Fallback: adult registrant, or a minor who hasn't started step 1 yet —
    // email the registrant with the portal link to start the form.
    const portalLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/${registration.confirmationCode}`

    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: replyToAddr,
      to: registration.email,
      subject: `Complete Your Liability Form - ${registration.event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F; margin-top: 0;">Complete Your Liability Form</h1>

            <p>Hi ${registration.firstName},</p>

            <p>This is a reminder to complete your liability form for <strong>${registration.event.name}</strong>.</p>

            ${isUnder18 ? `
            <div style="background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0;">
              <p style="color: #92400E; margin: 0;">
                <strong>Parent/Guardian Required:</strong> Since you are under 18, click below to enter your parent
                or guardian's email address. They will then receive their own separate email with a link to
                complete and sign the liability form on your behalf.
              </p>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalLink}" style="display: inline-block; padding: 15px 30px; background-color: #1E3A5F; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Complete Liability Form
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${portalLink}" style="color: #1E3A5F;">${portalLink}</a>
            </p>

            <p style="margin-top: 30px;">Pax Christi,<br><strong>ChiRho Events Team</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Error resending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
