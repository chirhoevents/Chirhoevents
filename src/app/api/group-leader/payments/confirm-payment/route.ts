import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const resend = new Resend(process.env.RESEND_API_KEY)

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
    include: { event: { select: { name: true, organizationId: true } } },
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
  try {
    const amount = Number(paymentRecord.amount)
    const cardLine = card ? `${(card.brand || '').toUpperCase()} ending in ${card.last4}` : null

    const emailHtml = wrapEmail(`
      <h2 style="color: #1E3A5F; margin: 0 0 20px;">Payment Confirmation</h2>
      <p>Dear ${groupReg.groupLeaderName},</p>
      <p>Your payment for <strong>${groupReg.event.name}</strong> has been successfully processed.</p>
      ${emailInfoBox(`
        <strong>Payment Details</strong><br/>
        Group: ${groupReg.groupName}<br/>
        Amount Paid: <strong>$${amount.toFixed(2)}</strong><br/>
        ${cardLine ? `Card: ${cardLine}<br/>` : ''}
        Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        ${receiptUrl ? `<br/><a href="${receiptUrl}" style="color:#9C8466;">View Stripe Receipt →</a>` : ''}
      `, 'success')}
      <p>You can view your full payment history and download invoices from your group leader portal.</p>
    `)

    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      to: groupReg.groupLeaderEmail,
      subject: `Payment Confirmed — ${groupReg.event.name}`,
      html: emailHtml,
    })
  } catch (emailError) {
    // Non-fatal — log but don't fail the response
    console.error('Failed to send receipt email:', emailError)
  }

  return NextResponse.json({ status: 'succeeded', receiptUrl })
}
