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
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

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

  // Handle Platform Invoice Payments (checkout.session.completed with platform_invoice type)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Check if this is a platform invoice payment
    if (session.metadata?.type === 'platform_invoice' || session.metadata?.invoiceId) {
      console.log('💳 Processing platform invoice payment')
      const { invoiceId, invoiceNumber, organizationId, invoiceType } = session.metadata

      if (!invoiceId) {
        console.error('❌ No invoiceId in session metadata for platform invoice')
        return NextResponse.json({ error: 'Missing invoice metadata' }, { status: 400 })
      }

      try {
        // Update invoice status to paid
        const invoice = await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'paid',
            paidAt: new Date(),
            paymentMethod: 'card',
            stripePaymentIntentId: session.payment_intent as string,
          },
          include: {
            organization: {
              select: { id: true, name: true, contactEmail: true },
            },
          },
        })

        console.log('✅ Invoice marked as paid:', invoiceNumber)

        // Handle subscription activation if this is a subscription invoice
        if (invoiceType === 'subscription') {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              subscriptionStatus: 'active',
              subscriptionStartedAt: new Date(),
            },
          })
          console.log('✅ Subscription activated for org:', organizationId)
        }

        // Handle setup fee
        if (invoiceType === 'setup_fee') {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              setupFeePaid: true,
            },
          })
          console.log('✅ Setup fee marked as paid for org:', organizationId)
        }

        // Log platform activity
        await prisma.platformActivityLog.create({
          data: {
            organizationId: organizationId,
            activityType: 'invoice_paid',
            description: `Invoice #${invoiceNumber} paid via online payment - $${(session.amount_total! / 100).toFixed(2)}`,
            metadata: {
              invoiceId,
              invoiceNumber,
              amount: session.amount_total! / 100,
              paymentMethod: 'card',
              stripeSessionId: session.id,
            },
          },
        })

        // Create billing note
        await prisma.billingNote.create({
          data: {
            organizationId: organizationId,
            invoiceId: invoiceId,
            noteType: 'payment_received',
            content: `Online payment received for Invoice #${invoiceNumber}: $${(session.amount_total! / 100).toFixed(2)} via credit card`,
          },
        })

        // Send payment confirmation email
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'billing@chirhoevents.com',
            to: invoice.organization.contactEmail,
            subject: `Payment Received - Invoice #${invoiceNumber}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
                  <h1 style="color: white; margin: 0;">ChirhoEvents</h1>
                </div>

                <div style="padding: 30px 20px;">
                  <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin-bottom: 20px;">
                    <h2 style="color: #155724; margin-top: 0;">Payment Received!</h2>
                    <p style="margin: 0; color: #155724;">Thank you for your payment.</p>
                  </div>

                  <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
                    <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${(session.amount_total! / 100).toFixed(2)}</p>
                    <p style="margin: 5px 0;"><strong>Payment Method:</strong> Credit Card</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  <p>This email serves as your receipt. If you have any questions, please contact us at support@chirhoevents.com.</p>

                  <p>Best regards,<br><strong>ChirhoEvents Team</strong></p>
                </div>

                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                  <p>&copy; ${new Date().getFullYear()} ChirhoEvents. All rights reserved.</p>
                </div>
              </div>
            `,
          })
          console.log('✅ Payment confirmation email sent to:', invoice.organization.contactEmail)
        } catch (emailError) {
          console.error('⚠️ Failed to send payment confirmation email:', emailError)
        }

        return NextResponse.json({ received: true })
      } catch (error) {
        console.error('❌ Error processing platform invoice payment:', error)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }
    }

    // Continue to existing checkout.session.completed handling for registrations...
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    console.log('💳 Processing payment_intent.succeeded event')
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    const { registrationId, registrationType, notes } = paymentIntent.metadata || {}
    console.log('📋 Payment intent metadata:', { registrationId, registrationType, notes })

    if (!registrationId) {
      console.error('❌ No registrationId in payment intent metadata')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Update payment status and store notes
      await prisma.payment.updateMany({
        where: {
          registrationId: registrationId,
          stripePaymentIntentId: paymentIntent.id,
        },
        data: {
          paymentStatus: 'succeeded',
          processedAt: new Date(),
        },
      })

      // Update payment balance
      const paymentRecord = await prisma.payment.findFirst({
        where: {
          registrationId: registrationId,
          stripePaymentIntentId: paymentIntent.id,
        },
        select: { amount: true },
      })

      console.log('💰 Payment record found:', paymentRecord ? `Amount: $${paymentRecord.amount}` : 'NOT FOUND')

      if (paymentRecord) {
        const balance = await prisma.paymentBalance.findUnique({
          where: { registrationId: registrationId },
        })

        console.log('📊 Current balance:', balance ? {
          totalDue: Number(balance.totalAmountDue),
          paid: Number(balance.amountPaid),
          remaining: Number(balance.amountRemaining)
        } : 'NOT FOUND')

        if (balance) {
          // RECALCULATE from all succeeded payments instead of incrementing
          // This makes the webhook idempotent - safe to call multiple times
          const allSucceededPayments = await prisma.payment.findMany({
            where: {
              registrationId: registrationId,
              paymentStatus: 'succeeded',
            },
            select: { id: true, amount: true },
          })

          const newAmountPaid = allSucceededPayments.reduce(
            (sum: number, p: any) => sum + Number(p.amount),
            0
          )
          const newAmountRemaining = Number(balance.totalAmountDue) - newAmountPaid

          console.log('🔄 Recalculating balance from', allSucceededPayments.length, 'payments:', {
            payments: allSucceededPayments.map((p: any) => Number(p.amount)),
            newAmountPaid,
            newAmountRemaining,
            status: newAmountRemaining <= 0 ? 'paid_full' : 'partial'
          })

          await prisma.paymentBalance.update({
            where: { registrationId: registrationId },
            data: {
              amountPaid: newAmountPaid,
              amountRemaining: newAmountRemaining,
              lastPaymentDate: new Date(),
              paymentStatus: newAmountRemaining <= 0 ? 'paid_full' : 'partial',
            },
          })

          console.log('✅ Balance updated successfully')
        } else {
          console.error('❌ PaymentBalance not found for registration:', registrationId)
        }
      } else {
        console.error('❌ Payment record not found for payment intent:', paymentIntent.id)
      }

      // Update registration status if group registration
      if (registrationType === 'group') {
        await prisma.groupRegistration.update({
          where: { id: registrationId },
          data: { registrationStatus: 'pending_forms' },
        })
      }

      console.log('✅ Payment intent processed successfully')
      return NextResponse.json({ received: true })
    } catch (error) {
      console.error('❌ Error processing payment_intent.succeeded:', error)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  } else if (event.type === 'checkout.session.completed') {
    console.log('💳 Processing checkout.session.completed event for registration')
    const session = event.data.object as Stripe.Checkout.Session

    // Skip if this is a platform invoice payment (already handled above)
    if (session.metadata?.type === 'platform_invoice' || session.metadata?.invoiceId) {
      console.log('⏭️ Skipping - already handled as platform invoice payment')
      return NextResponse.json({ received: true })
    }

    const { registrationId, accessCode, groupName, registrationType } = session.metadata || {}
    console.log('📋 Session metadata:', { registrationId, accessCode, groupName, registrationType })

    if (!registrationId) {
      console.error('❌ No registrationId in session metadata')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Handle INDIVIDUAL registration differently
      if (registrationType === 'individual') {
        console.log('👤 Processing individual registration payment')

        // Update payment status
        await prisma.payment.updateMany({
          where: {
            registrationId: registrationId,
            stripePaymentIntentId: session.id,
          },
          data: {
            paymentStatus: 'succeeded',
            processedAt: new Date(),
          },
        })

        // Update individual registration status
        const registration = await prisma.individualRegistration.update({
          where: { id: registrationId },
          data: { registrationStatus: 'complete' },
          include: {
            event: {
              include: {
                settings: true,
                pricing: true,
                organization: true,
              },
            },
          },
        })

        // Update payment balance
        await prisma.paymentBalance.updateMany({
          where: {
            registrationId: registrationId,
            registrationType: 'individual',
          },
          data: {
            amountPaid: registration.event.pricing?.onCampusYouthPrice || 150,
            amountRemaining: 0,
            lastPaymentDate: new Date(),
            paymentStatus: 'paid_full',
          },
        })

        // Send confirmation email with QR code
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: registration.email,
          subject: `Registration Confirmed - ${registration.event.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
                ${registration.event.organization.logoUrl
                  ? `<img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal-white.png" alt="${registration.event.organization.name}" style="max-height: 80px; max-width: 300px;" />`
                  : `<h1 style="color: white; margin: 0;">${registration.event.organization.name}</h1>`
                }
              </div>

              <div style="padding: 30px 20px;">
                <h1 style="color: #1E3A5F; margin-top: 0;">✅ Registration Confirmed!</h1>

                <p>Dear ${registration.firstName},</p>

                <p>Thank you for registering for <strong>${registration.event.name}</strong>! Your payment has been received and your registration is complete.</p>

                <div style="background-color: #E8F4F8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #1E3A5F;">
                  <h2 style="color: #1E3A5F; margin-top: 0;">Your Confirmation Code</h2>
                  <div style="background-color: white; padding: 15px; border-radius: 5px; display: inline-block; margin: 10px 0;">
                    <span style="font-size: 28px; font-weight: bold; color: #1E3A5F; letter-spacing: 2px; font-family: 'Courier New', monospace;">${registration.confirmationCode || 'N/A'}</span>
                  </div>
                  <p style="font-size: 14px; color: #666; margin-top: 10px;">
                    Keep this code safe! You'll need it for payments and to look up your registration.
                  </p>
                </div>

                <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin: 20px 0;">
                  <h3 style="color: #155724; margin-top: 0;">✓ Payment Confirmed</h3>
                  <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> Paid in Full</p>
                  <p style="margin: 5px 0; color: #155724;"><strong>Payment Method:</strong> Credit Card</p>
                </div>

                <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <h3 style="color: #1E3A5F; margin-top: 0;">Your Check-In QR Code</h3>
                  <p style="font-size: 16px; color: #1E3A5F; margin: 15px 0;">
                    <strong>View and download your QR code on your confirmation page:</strong>
                  </p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/registration/confirmation/individual/${registration.id}"
                     style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
                    View My QR Code
                  </a>
                  <p style="font-size: 14px; color: #666; margin-top: 15px;">
                    <strong>Save this QR code!</strong> You'll need it for check-in at the event.
                  </p>
                </div>

                <h3 style="color: #1E3A5F;">Registration Summary</h3>
                <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${registration.firstName} ${registration.lastName}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${registration.email}</p>
                  <p style="margin: 5px 0;"><strong>Housing:</strong> ${registration.housingType?.replace('_', ' ')}</p>
                  ${registration.roomType ? `<p style="margin: 5px 0;"><strong>Room Type:</strong> ${registration.roomType}</p>` : ''}
                </div>

                <h3 style="color: #1E3A5F;">Next Steps:</h3>
                <ol>
                  <li><strong>Save Your QR Code:</strong> Visit your confirmation page to download your QR code for check-in.</li>
                  <li><strong>Check-In:</strong> Bring your QR code (on your phone or printed) to check in at the event.</li>
                  <li><strong>Prepare:</strong> Review your confirmation details and pack accordingly.</li>
                </ol>

                ${registration.event.settings?.registrationInstructions ? `
                  <div style="background-color: #F0F8FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1E3A5F; margin-top: 0;">Important Information</h3>
                    <p style="white-space: pre-line;">${registration.event.settings.registrationInstructions}</p>
                  </div>
                ` : ''}

                <p>We can't wait to see you at ${registration.event.name}!</p>

                <p>Questions? Reply to this email or contact the event organizer.</p>

                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  © 2025 ${registration.event.organization.name}. All rights reserved.
                </p>
              </div>
            </div>
          `,
        })

        console.log('✅ Individual registration confirmed and email sent to:', registration.email)
        return NextResponse.json({ received: true })
      }

      // Handle GROUP registration
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
          // RECALCULATE from all succeeded payments instead of incrementing
          // This makes the webhook idempotent - safe to call multiple times
          const allSucceededPayments = await prisma.payment.findMany({
            where: {
              registrationId: registrationId,
              paymentStatus: 'succeeded',
            },
            select: { amount: true },
          })

          const newAmountPaid = allSucceededPayments.reduce(
            (sum: number, p: any) => sum + Number(p.amount),
            0
          )
          const newAmountRemaining = Number(balance.totalAmountDue) - newAmountPaid

          console.log('🔄 Group checkout: Recalculating balance from', allSucceededPayments.length, 'payments:', {
            newAmountPaid,
            newAmountRemaining,
          })

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
            <!-- ChiRho Events Logo Header -->
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F; margin-top: 0;">✅ Payment Confirmed!</h1>

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

  // Handle Stripe Connect account updates
  if (event.type === 'account.updated') {
    console.log('🏦 Processing account.updated event')
    const account = event.data.object as Stripe.Account

    try {
      // Find organization with this Stripe account ID
      const org = await prisma.organization.findFirst({
        where: { stripeAccountId: account.id }
      })

      if (!org) {
        console.log('⚠️ No organization found for Stripe account:', account.id)
        return NextResponse.json({ received: true })
      }

      // Update organization Stripe status
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeChargesEnabled: account.charges_enabled || false,
          stripePayoutsEnabled: account.payouts_enabled || false,
          stripeOnboardingCompleted: account.details_submitted || false,
          stripeAccountStatus: account.charges_enabled
            ? 'active'
            : account.details_submitted
            ? 'restricted'
            : 'pending'
        }
      })

      console.log('✅ Updated organization Stripe status:', {
        orgId: org.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      })
    } catch (error) {
      console.error('❌ Error processing account.updated:', error)
    }

    return NextResponse.json({ received: true })
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.created') {
    console.log('📝 Processing customer.subscription.created event')
    const subscription = event.data.object as Stripe.Subscription
    const organizationId = subscription.metadata?.organizationId

    if (!organizationId) {
      console.log('⚠️ No organizationId in subscription metadata')
      return NextResponse.json({ received: true })
    }

    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: 'active',
          subscriptionStartedAt: new Date(subscription.created * 1000),
          subscriptionRenewsAt: new Date(subscription.current_period_end * 1000),
        },
      })

      console.log('✅ Subscription created for org:', organizationId)
    } catch (error) {
      console.error('❌ Error processing subscription.created:', error)
    }

    return NextResponse.json({ received: true })
  }

  if (event.type === 'customer.subscription.updated') {
    console.log('🔄 Processing customer.subscription.updated event')
    const subscription = event.data.object as Stripe.Subscription
    const organizationId = subscription.metadata?.organizationId

    if (!organizationId) {
      // Try to find org by customer ID
      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      })
      if (!org) {
        console.log('⚠️ No organization found for subscription')
        return NextResponse.json({ received: true })
      }
    }

    try {
      const updateData: Record<string, unknown> = {
        subscriptionRenewsAt: new Date(subscription.current_period_end * 1000),
      }

      // Map Stripe status to our status
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        updateData.subscriptionStatus = 'active'
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        updateData.subscriptionStatus = 'suspended'
        updateData.cancelledAt = new Date()
      } else if (subscription.status === 'past_due') {
        updateData.subscriptionStatus = 'suspended'
      }

      if (subscription.cancel_at_period_end) {
        updateData.cancelledAt = subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null
      }

      await prisma.organization.update({
        where: { id: organizationId || undefined, stripeCustomerId: subscription.customer as string },
        data: updateData,
      })

      console.log('✅ Subscription updated for org:', organizationId)
    } catch (error) {
      console.error('❌ Error processing subscription.updated:', error)
    }

    return NextResponse.json({ received: true })
  }

  if (event.type === 'customer.subscription.deleted') {
    console.log('🗑️ Processing customer.subscription.deleted event')
    const subscription = event.data.object as Stripe.Subscription

    try {
      // Find org by subscription ID or customer ID
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: subscription.id },
            { stripeCustomerId: subscription.customer as string },
          ],
        },
      })

      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'suspended',
            cancelledAt: new Date(),
          },
        })

        console.log('✅ Subscription deleted, org suspended:', org.id)
      }
    } catch (error) {
      console.error('❌ Error processing subscription.deleted:', error)
    }

    return NextResponse.json({ received: true })
  }

  if (event.type === 'invoice.payment_succeeded') {
    console.log('💵 Processing invoice.payment_succeeded event')
    const invoice = event.data.object as Stripe.Invoice

    // Only handle subscription invoices
    if (!invoice.subscription) {
      return NextResponse.json({ received: true })
    }

    try {
      const org = await prisma.organization.findFirst({
        where: { stripeSubscriptionId: invoice.subscription as string },
      })

      if (org) {
        // Update subscription renewal date
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'active',
            subscriptionRenewsAt: invoice.lines.data[0]?.period?.end
              ? new Date(invoice.lines.data[0].period.end * 1000)
              : undefined,
          },
        })

        // Log platform activity
        await prisma.platformActivityLog.create({
          data: {
            organizationId: org.id,
            activityType: 'subscription_payment',
            description: `Subscription payment of $${(invoice.amount_paid / 100).toFixed(2)} succeeded`,
          },
        })

        console.log('✅ Invoice payment succeeded for org:', org.id)
      }
    } catch (error) {
      console.error('❌ Error processing invoice.payment_succeeded:', error)
    }

    return NextResponse.json({ received: true })
  }

  if (event.type === 'invoice.payment_failed') {
    console.log('❌ Processing invoice.payment_failed event')
    const invoice = event.data.object as Stripe.Invoice

    // Only handle subscription invoices
    if (!invoice.subscription) {
      return NextResponse.json({ received: true })
    }

    try {
      const org = await prisma.organization.findFirst({
        where: { stripeSubscriptionId: invoice.subscription as string },
      })

      if (org) {
        // Log platform activity
        await prisma.platformActivityLog.create({
          data: {
            organizationId: org.id,
            activityType: 'subscription_payment_failed',
            description: `Subscription payment of $${(invoice.amount_due / 100).toFixed(2)} failed`,
          },
        })

        console.log('⚠️ Invoice payment failed for org:', org.id)
      }
    } catch (error) {
      console.error('❌ Error processing invoice.payment_failed:', error)
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
