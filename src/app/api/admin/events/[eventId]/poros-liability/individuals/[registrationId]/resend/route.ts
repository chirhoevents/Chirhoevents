import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFormsViewAccess } from '@/lib/api-auth'
import { Resend } from 'resend'

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

    // Fetch the individual registration with event info
    const registration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          include: {
            settings: true,
          },
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
    const portalLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/${registration.confirmationCode}`

    // Send the email
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
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
                <strong>Parent/Guardian Required:</strong> Since you are under 18, a parent or guardian must complete and sign your liability form.
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
