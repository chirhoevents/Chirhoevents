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
  console.log('🔔 Stripe webhook received')
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('✅ Webhook signature verified, event type:', event.type)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    console.log('💳 Processing checkout.session.completed event')
    const session = event.data.object as Stripe.Checkout.Session

    const { registrationId, accessCode, groupName } = session.metadata || {}
    console.log('📋 Session metadata:', { registrationId, accessCode, groupName })

    if (!registrationId) {
      console.error('❌ No registrationId in session metadata')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Update payment status
      const payment = await prisma.payment.updateMany({
        where: {
          registrationId: registrationId,
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

      // Update payment balance
      const paymentAmount = await prisma.payment.findFirst({
        where: {
          registrationId: registrationId,
          stripePaymentIntentId: session.id,
        },
        select: { amount: true },
      })

      if (paymentAmount) {
        const balance = await prisma.paymentBalance.findUnique({
          where: { registrationId: registrationId },
        })

        if (balance) {
          const newAmountPaid = Number(balance.amountPaid) + Number(paymentAmount.amount)
          const newAmountRemaining = Number(balance.totalAmountDue) - newAmountPaid

          await prisma.paymentBalance.update({
            where: { registrationId: registrationId },
            data: {
              amountPaid: newAmountPaid,
              amountRemaining: newAmountRemaining,
              lastPaymentDate: new Date(),
              paymentStatus: newAmountRemaining <= 0 ? 'paid_full' : 'partial',
            },
          })
        }
      }

      // Fetch registration details for email
      const registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            include: {
              settings: true,
              pricing: true,
            },
          },
        },
      })

      if (!registration) {
        throw new Error('Registration not found')
      }

      // Fetch payment balance for amounts
      const paymentBalance = await prisma.paymentBalance.findUnique({
        where: { registrationId: registrationId },
      })

      const depositPaid = paymentBalance ? Number(paymentBalance.amountPaid) : 0
      const totalAmount = paymentBalance ? Number(paymentBalance.totalAmountDue) : 0
      const balanceRemaining = paymentBalance ? Number(paymentBalance.amountRemaining) : 0

      // Send confirmation email
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: registration.groupLeaderEmail,
        subject: `Payment Confirmed - ${registration.event.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1E3A5F;">✅ Payment Confirmed!</h1>

            <p>Thank you for your payment! Your registration for <strong>${registration.groupName}</strong> at ${registration.event.name} is now confirmed.</p>

            <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #9C8466; margin-top: 0;">Your Access Code</h2>
              <p style="font-size: 24px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 2px;">
                ${registration.accessCode}
              </p>
              <p style="font-size: 14px; color: #666;">
                Save this code! You'll need it to complete liability forms and access your group portal.
              </p>
            </div>

            <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">✓ Payment Received</h3>
              <p style="margin: 5px 0; color: #155724;"><strong>Deposit Paid:</strong> $${depositPaid.toFixed(2)}</p>
              ${balanceRemaining > 0 ? `
                <p style="margin: 5px 0; color: #155724;"><strong>Balance Remaining:</strong> $${balanceRemaining.toFixed(2)}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #155724;">Pay the remaining balance before the event using your access code.</p>
              ` : `
                <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> Paid in Full</p>
              `}
            </div>

            <h3 style="color: #1E3A5F;">Registration Summary</h3>
            <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>Group:</strong> ${registration.groupName}</p>
              <p style="margin: 5px 0;"><strong>Participants:</strong> ${registration.totalParticipants}</p>
              <p style="margin: 5px 0;"><strong>Total Cost:</strong> $${totalAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${depositPaid.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> Credit Card</p>
            </div>

            <h3 style="color: #1E3A5F;">Next Steps:</h3>
            <ol>
              <li><strong>Complete Liability Forms:</strong> Each participant must complete their liability form using your access code.</li>
              ${balanceRemaining > 0 ? '<li><strong>Pay Remaining Balance:</strong> Use your access code in the Group Portal to pay the balance before the event.</li>' : ''}
              <li><strong>Check-In:</strong> Bring your access code to check in at the event.</li>
            </ol>

            ${registration.event.settings?.registrationInstructions ? `
              <div style="background-color: #F0F8FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Important Information</h3>
                <p style="white-space: pre-line;">${registration.event.settings.registrationInstructions}</p>
              </div>
            ` : ''}

            <p>Questions? Reply to this email or contact the event organizer.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        `,
      })

      console.log('✅ Payment confirmed and email sent to:', registration.groupLeaderEmail)
      console.log('✅ Registration ID:', registrationId)
    } catch (error) {
      console.error('❌ Error processing payment webhook:', error)
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
