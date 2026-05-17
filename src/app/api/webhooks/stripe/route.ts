import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { generateGroupRegistrationConfirmationEmail, wrapEmail, emailInfoBox } from '@/lib/email-templates'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const resend = new Resend(process.env.RESEND_API_KEY)

function getSubscriptionPriceId(tier: string, billingCycle: string): string | null {
  const key = `${tier}_${billingCycle}`
  const priceMap: Record<string, string | undefined> = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    parish_monthly: process.env.STRIPE_PRICE_PARISH_MONTHLY,
    small_diocese_monthly: process.env.STRIPE_PRICE_PARISH_MONTHLY,
    cathedral_monthly: process.env.STRIPE_PRICE_CATHEDRAL_MONTHLY,
    cathedral_annual: process.env.STRIPE_PRICE_CATHEDRAL_ANNUAL,
    growing_monthly: process.env.STRIPE_PRICE_CATHEDRAL_MONTHLY,
    growing_annual: process.env.STRIPE_PRICE_CATHEDRAL_ANNUAL,
    shrine_monthly: process.env.STRIPE_PRICE_SHRINE_MONTHLY,
    shrine_annual: process.env.STRIPE_PRICE_SHRINE_ANNUAL,
    conference_monthly: process.env.STRIPE_PRICE_SHRINE_MONTHLY,
    conference_annual: process.env.STRIPE_PRICE_SHRINE_ANNUAL,
  }
  return priceMap[key] ?? null
}

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
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'paid',
            paidAt: new Date(),
            paymentMethod: 'credit_card',
            stripePaymentIntentId: session.payment_intent as string,
            stripeCheckoutSessionId: session.id,
          },
        })

        // Fetch invoice and organization separately to avoid schema mismatch
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            organizationId: true,
            organization: {
              select: { id: true, name: true, contactEmail: true },
            },
          },
        })

        if (!invoice) {
          console.error('❌ Invoice not found after update:', invoiceId)
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        console.log('✅ Invoice marked as paid:', invoiceNumber)

        // Note: The Payment model is for event registration payments, not platform invoices.
        // Platform invoice payments are tracked via the Invoice record itself (status, paidAt,
        // stripePaymentIntentId, stripeCheckoutSessionId fields).

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

        // Handle setup fee — mark paid then automatically start the recurring subscription
        if (invoiceType === 'setup_fee') {
          await prisma.organization.update({
            where: { id: organizationId },
            data: { setupFeePaid: true },
          })
          console.log('✅ Setup fee marked as paid for org:', organizationId)

          // Start recurring subscription using the card they just paid with
          try {
            const org = await prisma.organization.findUnique({
              where: { id: organizationId },
              select: { subscriptionTier: true, billingCycle: true, stripeCustomerId: true },
            })

            if (org?.stripeCustomerId) {
              const priceId = getSubscriptionPriceId(org.subscriptionTier, org.billingCycle ?? 'monthly')

              if (priceId) {
                // Retrieve the saved payment method from the checkout session
                const checkoutSession = await stripe.checkout.sessions.retrieve(session.id, {
                  expand: ['payment_intent.payment_method'],
                })
                const paymentIntent = checkoutSession.payment_intent as Stripe.PaymentIntent | null
                const pm = paymentIntent?.payment_method

                if (pm) {
                  const pmId = typeof pm === 'string' ? pm : pm.id

                  // Attach the payment method to the customer and set it as default
                  await stripe.paymentMethods.attach(pmId, { customer: org.stripeCustomerId })
                  await stripe.customers.update(org.stripeCustomerId, {
                    invoice_settings: { default_payment_method: pmId },
                  })

                  // Create the recurring subscription — webhook customer.subscription.created will update the org
                  await stripe.subscriptions.create({
                    customer: org.stripeCustomerId,
                    items: [{ price: priceId }],
                    default_payment_method: pmId,
                    metadata: { organizationId },
                  })
                  console.log('✅ Recurring subscription created for org:', organizationId)
                } else {
                  console.warn('⚠️ No payment method on checkout session — subscription not created for org:', organizationId)
                }
              } else {
                console.warn('⚠️ No Stripe price ID configured for tier', org.subscriptionTier, org.billingCycle, '— subscription not created')
              }
            }
          } catch (subError) {
            console.error('❌ Failed to create subscription after setup fee payment:', subError)
            // Non-fatal — setup fee is already marked paid; admin can create subscription manually
          }
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

        // Note: Billing notes require a createdByUserId, so we skip creating
        // one for automated webhook payments. The payment is recorded in the
        // Payment table and invoice status is updated to 'paid'.

        // Send payment confirmation email
        try {
          await resend.emails.send({
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: 'support@chirhoevents.com',
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

        // Update payment status — match by payment intent ID (pi_...) stored at checkout creation
        await prisma.payment.updateMany({
          where: {
            registrationId: registrationId,
            stripePaymentIntentId: session.payment_intent as string,
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

        // Update payment balance with the actual amount Stripe collected
        const actualAmountPaid = session.amount_total! / 100
        const existingBalance = await prisma.paymentBalance.findFirst({
          where: { registrationId: registrationId, registrationType: 'individual' },
          select: { totalAmountDue: true },
        })
        const totalAmountDue = existingBalance ? Number(existingBalance.totalAmountDue) : actualAmountPaid
        const amountRemaining = Math.max(0, totalAmountDue - actualAmountPaid)

        await prisma.paymentBalance.updateMany({
          where: {
            registrationId: registrationId,
            registrationType: 'individual',
          },
          data: {
            amountPaid: actualAmountPaid,
            amountRemaining,
            lastPaymentDate: new Date(),
            paymentStatus: amountRemaining <= 0 ? 'paid_full' : 'partial',
          },
        })

        // Send confirmation email with QR code
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: 'support@chirhoevents.com',
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
                  ${registration.event.settings?.liabilityFormsRequiredIndividual ? `
                  <li><strong>Complete Your Liability Form:</strong> Click the button below to complete your required liability form.</li>
                  ` : ''}
                  <li><strong>Check-In:</strong> Bring your QR code (on your phone or printed) to check in at the event.</li>
                  <li><strong>Prepare:</strong> Review your confirmation details and pack accordingly.</li>
                </ol>

                ${registration.event.settings?.liabilityFormsRequiredIndividual ? `
                <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #F59E0B;">
                  <h3 style="color: #92400E; margin-top: 0;">📋 Liability Form Required</h3>
                  <p style="color: #92400E; margin-bottom: 15px;">
                    ${registration.age && registration.age < 18
                      ? 'Since you are under 18, a parent or guardian must complete and sign your liability form.'
                      : 'Please complete your liability form before the event.'}
                  </p>
                  <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/${registration.confirmationCode}"
                       style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Complete Liability Form
                    </a>
                  </div>
                  <p style="color: #78716C; font-size: 12px; margin-top: 15px; text-align: center;">
                    Or copy this link: ${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/${registration.confirmationCode}
                  </p>
                </div>
                ` : ''}

                ${registration.event.settings?.registrationInstructions ? `
                  <div style="background-color: #F0F8FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1E3A5F; margin-top: 0;">Important Information</h3>
                    <p style="white-space: pre-line;">${registration.event.settings.registrationInstructions}</p>
                  </div>
                ` : ''}

                <p>We can't wait to see you at ${registration.event.name}!</p>

                <!-- FIX 3.14: Org contact info -->
                <div style="background-color: #E8F4FD; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1E3A5F;">
                  <h3 style="color: #1E3A5F; margin-top: 0;">Need to Make Changes?</h3>
                  <p style="color: #333; margin-bottom: 8px;">
                    Individual registrations are managed by <strong>${registration.event.organization.name}</strong>.
                    Please contact the organizer directly:
                  </p>
                  ${registration.event.organization.contactEmail ? `<p style="margin: 4px 0;">📧 <a href="mailto:${registration.event.organization.contactEmail}" style="color: #1E3A5F;">${registration.event.organization.contactEmail}</a></p>` : ''}
                  ${registration.event.organization.contactPhone ? `<p style="margin: 4px 0;">📞 <a href="tel:${registration.event.organization.contactPhone}" style="color: #1E3A5F;">${registration.event.organization.contactPhone}</a></p>` : ''}
                  ${registration.event.organization.website ? `<p style="margin: 4px 0;">🌐 <a href="${registration.event.organization.website}" style="color: #1E3A5F;">${registration.event.organization.website}</a></p>` : ''}
                </div>

                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  © 2025 ${registration.event.organization.name}. All rights reserved.
                </p>
              </div>
            </div>
          `,
        })

        console.log('✅ Individual registration confirmed and email sent to:', registration.email)

        // FIX 2.6: Increment coupon usage after confirmed payment
        if (session.metadata?.couponId) {
          await prisma.coupon.update({
            where: { id: session.metadata.couponId },
            data: { usageCount: { increment: 1 } },
          }).catch((err: any) => console.error('⚠️ Failed to increment coupon usage:', err))
        }

        return NextResponse.json({ received: true })
      }

      // Handle STAFF registration
      if (registrationType === 'staff') {
        console.log('👔 Processing staff registration payment')

        const actualAmountPaid = session.amount_total! / 100
        const paymentIntentId = session.payment_intent as string

        // Update staff registration payment status
        await prisma.staffRegistration.update({
          where: { id: registrationId },
          data: { paymentStatus: 'paid' },
        })

        // Create Payment record with actual collected amount and real payment intent ID
        await prisma.payment.create({
          data: {
            registrationId,
            registrationType: 'staff',
            amount: actualAmountPaid,
            paymentType: 'balance',
            paymentMethod: 'card',
            paymentStatus: 'succeeded',
            stripePaymentIntentId: paymentIntentId,
            processedAt: new Date(),
            organizationId: session.metadata?.organizationId || '',
            eventId: session.metadata?.eventId || '',
          },
        })

        // Fetch staff registration for the confirmation email
        const staffReg = await prisma.staffRegistration.findUnique({
          where: { id: registrationId },
          include: {
            event: {
              include: {
                organization: { select: { name: true } },
              },
            },
          },
        })

        if (staffReg) {
          try {
            const emailContent = wrapEmail(`
              <h1>Staff Registration Confirmed!</h1>

              <p>Hi ${staffReg.firstName},</p>

              <p>Your payment has been received and your staff registration for <strong>${staffReg.event.name}</strong> is confirmed.</p>

              ${emailInfoBox(`
                <strong>Amount Paid:</strong> $${actualAmountPaid.toFixed(2)}<br>
                <strong>Registration Status:</strong> Confirmed &amp; Paid
              `, 'success')}

              <h2>Registration Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:20px;margin:16px 0;">
                <tr><td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#666;font-size:14px;">Name</td>
                      <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;color:#1E3A5F;">${staffReg.firstName} ${staffReg.lastName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#666;font-size:14px;">Role</td>
                      <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;color:#1E3A5F;">${staffReg.role}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;color:#666;font-size:14px;">Amount Paid</td>
                      <td style="padding:10px 0;text-align:right;font-weight:600;color:#1E3A5F;">$${actualAmountPaid.toFixed(2)}</td>
                    </tr>
                  </table>
                </td></tr>
              </table>

              ${staffReg.porosAccessCode ? `
              <h2>Liability Form Required</h2>
              ${emailInfoBox('<strong>Action Required:</strong> Please complete your liability form before the event.', 'warning')}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8f4fd;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
                <tr><td>
                  <p style="margin:0;font-size:14px;color:#666;">Your Liability Form Access Code</p>
                  <p style="margin:8px 0 0 0;font-size:32px;font-weight:bold;letter-spacing:4px;color:#1E3A5F;">${staffReg.porosAccessCode}</p>
                </td></tr>
              </table>
              ` : ''}

              <p>We look forward to seeing you at the event!</p>
            `, { organizationName: staffReg.event.organization.name, preheader: `Staff registration confirmed for ${staffReg.event.name}` })

            await resend.emails.send({
              from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
              reply_to: 'support@chirhoevents.com',
              to: staffReg.email,
              subject: `Staff Registration Confirmed & Paid - ${staffReg.event.name}`,
              html: emailContent,
            })

            console.log('✅ Staff registration confirmed, email sent to:', staffReg.email)
          } catch (emailError) {
            console.error('⚠️ Failed to send staff confirmation email:', emailError)
          }
        }

        return NextResponse.json({ received: true })
      }

      // Handle GROUP registration
      const payment = await prisma.payment.updateMany({
        where: {
          registrationId: registrationId,
          stripePaymentIntentId: session.payment_intent as string,
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
          stripePaymentIntentId: session.payment_intent as string,
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

      // FIX 2.6: Increment coupon usage after confirmed group payment
      if (session.metadata?.couponId) {
        await prisma.coupon.update({
          where: { id: session.metadata.couponId },
          data: { usageCount: { increment: 1 } },
        }).catch((err: any) => console.error('⚠️ Failed to increment coupon usage:', err))
      }

      // Fetch registration details for email
      const registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            include: {
              settings: true,
              pricing: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
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

      // Generate QR code if not already stored
      let qrCodeDataUrl = registration.qrCode
      if (!qrCodeDataUrl) {
        const qrData = JSON.stringify({
          registration_id: registration.id,
          event_id: registration.eventId,
          type: 'group',
          group_name: registration.groupName,
          access_code: registration.accessCode,
        })
        qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 300,
        })
        // Store for future use
        await prisma.groupRegistration.update({
          where: { id: registration.id },
          data: { qrCode: qrCodeDataUrl },
        })
      }

      // Build URLs for email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
      const porosLiabilityUrl = `${appUrl}/poros/liability?code=${registration.accessCode}`
      const groupLeaderPortalUrl = `${appUrl}/dashboard/group-leader`
      const confirmationPageUrl = `${appUrl}/registration/confirmation/${registration.id}`

      // Generate email using the template
      const emailHtml = generateGroupRegistrationConfirmationEmail({
        groupName: registration.groupName,
        groupLeaderName: registration.groupLeaderName,
        eventName: registration.event.name,
        accessCode: registration.accessCode,
        confirmationPageUrl,
        totalParticipants: registration.totalParticipants,
        totalAmount,
        depositAmount: depositPaid,
        balanceRemaining,
        paymentMethod: 'card',
        registrationInstructions: registration.event.settings?.registrationInstructions || undefined,
        customMessage: registration.event.settings?.confirmationEmailMessage || undefined,
        organizationName: registration.event.organization.name,
        porosLiabilityUrl,
        groupLeaderPortalUrl,
      })

      // Send confirmation email
      await resend.emails.send({
        from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
        reply_to: 'support@chirhoevents.com',
        to: registration.groupLeaderEmail,
        subject: `Payment Confirmed - ${registration.event.name}`,
        html: emailHtml,
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
    const stripeInvoice = event.data.object as Stripe.Invoice

    // Only handle subscription invoices
    if (!stripeInvoice.subscription) {
      return NextResponse.json({ received: true })
    }

    try {
      const org = await prisma.organization.findFirst({
        where: { stripeSubscriptionId: stripeInvoice.subscription as string },
      })

      if (org) {
        const periodEnd = stripeInvoice.lines.data[0]?.period?.end
          ? new Date(stripeInvoice.lines.data[0].period.end * 1000)
          : new Date()

        // Update subscription renewal date
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: 'active',
            subscriptionRenewsAt: periodEnd,
          },
        })

        // Create a local invoice record so it shows up in the billing panel
        // Skip if this is a $0 trial invoice
        if (stripeInvoice.amount_paid > 0) {
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true },
          })
          const nextInvoiceNumber = (lastInvoice?.invoiceNumber || 1000) + 1
          const isFirstPayment = stripeInvoice.billing_reason === 'subscription_create'

          await prisma.invoice.create({
            data: {
              organizationId: org.id,
              invoiceNumber: nextInvoiceNumber,
              invoiceType: 'subscription',
              amount: stripeInvoice.amount_paid / 100,
              description: isFirstPayment ? 'First subscription payment (via Stripe)' : 'Monthly subscription renewal (via Stripe)',
              status: 'paid',
              paidAt: stripeInvoice.status_transitions?.paid_at
                ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
                : new Date(),
              dueDate: periodEnd,
              stripePaymentIntentId: typeof stripeInvoice.payment_intent === 'string'
                ? stripeInvoice.payment_intent
                : null,
            },
          })
          console.log('✅ Local invoice record created for subscription payment')
        }

        // Log platform activity
        await prisma.platformActivityLog.create({
          data: {
            organizationId: org.id,
            activityType: 'subscription_payment',
            description: `Subscription payment of $${(stripeInvoice.amount_paid / 100).toFixed(2)} succeeded`,
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

  // Fix #9: Handle checkout session expiry — release capacity and mark registration expired
  if (event.type === 'checkout.session.expired') {
    console.log('⏰ Processing checkout.session.expired event')
    const session = event.data.object as Stripe.Checkout.Session

    // Skip platform invoice sessions
    if (session.metadata?.type === 'platform_invoice' || session.metadata?.invoiceId) {
      return NextResponse.json({ received: true })
    }

    const registrationId = session.metadata?.registrationId
    if (!registrationId) {
      console.log('⚠️ checkout.session.expired: no registrationId in metadata, skipping')
      return NextResponse.json({ received: true })
    }

    try {
      const registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: {
          id: true,
          registrationStatus: true,
          totalParticipants: true,
          eventId: true,
          organizationId: true,
          housingType: true,
          ticketType: true,
          event: { select: { capacityTotal: true, capacityRemaining: true } },
        },
      })

      if (!registration) {
        console.log(`⚠️ checkout.session.expired: registration ${registrationId} not found`)
        return NextResponse.json({ received: true })
      }

      // Idempotency: only act on registrations still in incomplete/pending state
      if (registration.registrationStatus !== 'incomplete' && registration.registrationStatus !== 'pending_payment') {
        console.log(`ℹ️ checkout.session.expired: registration ${registrationId} already in status ${registration.registrationStatus}, skipping`)
        return NextResponse.json({ received: true })
      }

      // Mark registration expired and release capacity atomically
      await prisma.$transaction(async (tx) => {
        await tx.groupRegistration.update({
          where: { id: registrationId },
          data: { registrationStatus: 'expired' },
        })

        // Release event capacity if capacity tracking is enabled
        if (registration.event.capacityTotal !== null) {
          await tx.$executeRaw`
            UPDATE events
            SET capacity_remaining = LEAST(capacity_total, capacity_remaining + ${registration.totalParticipants})
            WHERE id = ${registration.eventId}::uuid
          `
        }

        // Mark the payment record as expired
        await tx.payment.updateMany({
          where: {
            registrationId,
            registrationType: 'group',
            paymentStatus: 'pending',
          },
          data: { paymentStatus: 'expired' },
        })
      })

      console.log(`✅ checkout.session.expired: registration ${registrationId} marked expired, capacity released`)
    } catch (error) {
      console.error('❌ Error processing checkout.session.expired:', error)
    }

    return NextResponse.json({ received: true })
  }

  // Fix #9: Handle payment intent failure — mark payment failed
  if (event.type === 'payment_intent.payment_failed') {
    console.log('❌ Processing payment_intent.payment_failed event')
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    const registrationId = paymentIntent.metadata?.registrationId
    if (!registrationId) {
      console.log('⚠️ payment_intent.payment_failed: no registrationId in metadata, skipping')
      return NextResponse.json({ received: true })
    }

    try {
      // Idempotency: check if already handled
      const existingPayment = await prisma.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'failed',
        },
      })
      if (existingPayment) {
        console.log(`ℹ️ payment_intent.payment_failed: already marked failed for intent ${paymentIntent.id}`)
        return NextResponse.json({ received: true })
      }

      await prisma.payment.updateMany({
        where: {
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'pending',
        },
        data: { paymentStatus: 'failed' },
      })

      // Flag the registration as payment_failed so it's visible to admins
      await prisma.groupRegistration.updateMany({
        where: {
          id: registrationId,
          registrationStatus: 'incomplete',
        },
        data: { registrationStatus: 'payment_failed' },
      })

      console.log(`✅ payment_intent.payment_failed: payment marked failed for registration ${registrationId}`)
    } catch (error) {
      console.error('❌ Error processing payment_intent.payment_failed:', error)
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
