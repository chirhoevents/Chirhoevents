import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const { registrationId, accessCode, groupName } = session.metadata || {}

    if (!registrationId) {
      console.error('No registrationId in session metadata')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Update payment status
      await prisma.payment.updateMany({
        where: {
          groupRegistrationId: registrationId,
          stripePaymentIntentId: session.id,
        },
        data: {
          paymentStatus: 'succeeded',
          processedAt: new Date(),
        },
      })

      // Update registration status
      await prisma.groupRegistration.update({
        where: { id: registrationId },
        data: { registrationStatus: 'pending_forms' },
      })

      // Fetch registration details for email
      const registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        include: { event: true },
      })

      if (!registration) {
        throw new Error('Registration not found')
      }

      // Send confirmation email
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: registration.groupLeaderEmail,
        subject: `Registration Confirmed - ${registration.event.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1E3A5F;">Registration Confirmed!</h1>

            <p>Thank you for registering <strong>${registration.groupName}</strong> for ${registration.event.name}!</p>

            <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #9C8466; margin-top: 0;">Your Access Code</h2>
              <p style="font-size: 24px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 2px;">
                ${registration.accessCode}
              </p>
              <p style="font-size: 14px; color: #666;">
                Save this code! You'll need it to complete liability forms and access your group portal.
              </p>
            </div>

            <h3 style="color: #1E3A5F;">Next Steps:</h3>
            <ol>
              <li><strong>Complete Liability Forms:</strong> Each participant must complete their liability form.</li>
              <li><strong>Pay Remaining Balance:</strong> Use your access code to pay the balance before the event.</li>
              <li><strong>Check-In:</strong> Bring your access code to check in at the event.</li>
            </ol>

            <div style="background-color: #E8F4F8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Group:</strong> ${registration.groupName}<br/>
                <strong>Participants:</strong> ${registration.totalParticipants}<br/>
                <strong>Event:</strong> ${registration.event.name}
              </p>
            </div>

            <p>Questions? Reply to this email or visit our help center.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        `,
      })

      console.log('✅ Payment confirmed and email sent for registration:', registrationId)
    } catch (error) {
      console.error('Error processing payment webhook:', error)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
