import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { resolveReplyTo } from '@/lib/email-reply-to'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const resend = new Resend(process.env.RESEND_API_KEY)

const RECEIPT_EMAIL_TYPE = 'group_payment_receipt'

export async function POST(req: NextRequest) {
  const userId = await getClerkUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentIntentId } = await req.json()
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 })
  }

  const paymentRecord = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    select: {
      id: true,
      registrationId: true,
      registrationType: true,
      amount: true,
      paymentStatus: true,
    },
  })

  if (!paymentRecord) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // Verify this registration belongs to the current user
  const groupReg = await prisma.groupRegistration.findFirst({
    where: { id: paymentRecord.registrationId, clerkUserId: userId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          organizationId: true,
          settings: { select: { contactEmail: true } },
          organization: { select: { contactEmail: true } },
        },
      },
    },
  })

  if (!groupReg) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Pull current status from Stripe (even if already marked succeeded — we still need
  // charge details for the receipt and need to ensure the email is sent)
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  })

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json({ status: paymentIntent.status })
  }

  const charge = paymentIntent.latest_charge as Stripe.Charge | null
  const receiptUrl = charge?.receipt_url || null
  const card = charge?.payment_method_details?.card

  // Update the payment record (idempotent — safe to run even if webhook already did this)
  await prisma.payment.updateMany({
    where: {
      registrationId: paymentRecord.registrationId,
      stripePaymentIntentId: paymentIntentId,
    },
    data: {
      paymentStatus: 'succeeded',
      processedAt: new Date(),
      receiptUrl,
      stripeChargeId: charge?.id || null,
      cardLast4: card?.last4 || null,
      cardBrand: card?.brand || null,
    },
  })

  // Recalculate and update payment balance
  const balance = await prisma.paymentBalance.findUnique({
    where: { registrationId: paymentRecord.registrationId },
  })

  if (balance) {
    const allSucceeded = await prisma.payment.findMany({
      where: { registrationId: paymentRecord.registrationId, paymentStatus: 'succeeded' },
      select: { amount: true },
    })
    const newAmountPaid = allSucceeded.reduce((sum, p) => sum + Number(p.amount), 0)
    const newAmountRemaining = Number(balance.totalAmountDue) - newAmountPaid

    await prisma.paymentBalance.update({
      where: { registrationId: paymentRecord.registrationId },
      data: {
        amountPaid: newAmountPaid,
        amountRemaining: newAmountRemaining,
        lastPaymentDate: new Date(),
        paymentStatus: newAmountRemaining <= 0 ? 'paid_full' : 'partial',
      },
    })
  }

  // Update group registration status
  await prisma.groupRegistration.update({
    where: { id: paymentRecord.registrationId },
    data: { registrationStatus: 'pending_forms' },
  })

  // Send receipt email
  const amount = Number(paymentRecord.amount)
  const cardLine = card ? `${(card.brand || '').toUpperCase()} ending in ${card.last4}` : null
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Fix #C4: Idempotency — skip the send if we've already logged a receipt for
  // this paymentIntent. This endpoint is invoked on every visit to the Stripe
  // success page (incl. refreshes and back-button), so without this guard a
  // group leader would receive a duplicate receipt every time they reload.
  const existingReceipt = await prisma.emailLog.findFirst({
    where: {
      registrationId: paymentRecord.registrationId,
      registrationType: 'group',
      emailType: RECEIPT_EMAIL_TYPE,
      sentStatus: 'sent',
      metadata: {
        path: ['paymentIntentId'],
        equals: paymentIntentId,
      },
    },
    select: { id: true },
  })

  if (existingReceipt) {
    return NextResponse.json({ status: 'succeeded', receiptUrl, emailAlreadySent: true })
  }

  const emailSubject = `Payment Confirmed — ${groupReg.event.name}`
  const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <h1 style="color: white; margin: 0;">ChiRho Events</h1>
          </div>

          <div style="padding: 30px 20px;">
            <div style="background-color: #D4EDDA; padding: 20px; border-left: 4px solid #28A745; margin-bottom: 20px;">
              <h2 style="color: #155724; margin-top: 0;">Payment Confirmed!</h2>
              <p style="margin: 0; color: #155724;">Your payment has been successfully processed.</p>
            </div>

            <p>Dear ${groupReg.groupLeaderName},</p>
            <p>Thank you — your payment for <strong>${groupReg.event.name}</strong> has been received.</p>

            <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Group:</strong> ${groupReg.groupName}</p>
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${amount.toFixed(2)}</p>
              ${cardLine ? `<p style="margin: 5px 0;"><strong>Card:</strong> ${cardLine}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
              ${receiptUrl ? `<p style="margin: 5px 0;"><a href="${receiptUrl}" style="color: #9C8466;">View Stripe Receipt</a></p>` : ''}
            </div>

            <p>You can view your full payment history and download invoices from your group leader portal.</p>
            <p>If you have any questions, please contact us at support@chirhoevents.com.</p>
            <p>Best regards,<br><strong>ChiRho Events Team</strong></p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>ChiRho Events | support@chirhoevents.com</p>
          </div>
        </div>
      `

  const logData = {
    organizationId: groupReg.event.organizationId,
    eventId: groupReg.event.id,
    registrationId: paymentRecord.registrationId,
    registrationType: 'group' as const,
    recipientEmail: groupReg.groupLeaderEmail,
    recipientName: groupReg.groupLeaderName,
    emailType: RECEIPT_EMAIL_TYPE,
    subject: emailSubject,
    htmlContent: emailHtml,
    metadata: {
      paymentIntentId,
      amount,
      cardBrand: card?.brand || null,
      cardLast4: card?.last4 || null,
      receiptUrl: receiptUrl || null,
    },
  }

  try {
    const { error: emailError } = await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: resolveReplyTo(groupReg.event.settings, groupReg.event.organization),
      to: groupReg.groupLeaderEmail,
      subject: emailSubject,
      html: emailHtml,
    })

    if (emailError) {
      await logEmailFailure(logData, emailError.message || 'Unknown Resend error')
    } else {
      await logEmail(logData)
    }
  } catch (emailError) {
    await logEmailFailure(
      logData,
      emailError instanceof Error ? emailError.message : 'Unknown exception sending receipt email'
    )
  }

  return NextResponse.json({ status: 'succeeded', receiptUrl })
}
