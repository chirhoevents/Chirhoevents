import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Returns the Stripe receipt URL for a payment, fetching from Stripe and
// backfilling the Payment row if it's missing. Used by the admin Payments
// modal so older payments (that pre-date the webhook fix that captures
// receipt URLs at checkout-session completion) still get a clickable
// receipt link.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        organizationId: true,
        receiptUrl: true,
        stripeChargeId: true,
        stripePaymentIntentId: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (!canAccessOrganization(user, payment.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (payment.receiptUrl) {
      return NextResponse.json({ receiptUrl: payment.receiptUrl })
    }

    // Backfill from Stripe — only possible if we have a real payment intent
    // (cs_/null placeholders from pending rows won't resolve).
    if (!payment.stripePaymentIntentId || !payment.stripePaymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'No Stripe payment intent on file' }, { status: 404 })
    }

    let receiptUrl: string | null = null
    let stripeChargeId: string | null = payment.stripeChargeId
    let cardLast4: string | null = null
    let cardBrand: string | null = null

    try {
      const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
        expand: ['latest_charge'],
      })
      const charge = pi.latest_charge as Stripe.Charge | null
      if (charge) {
        receiptUrl = charge.receipt_url || null
        stripeChargeId = charge.id
        cardLast4 = charge.payment_method_details?.card?.last4 || null
        cardBrand = charge.payment_method_details?.card?.brand || null
      }
    } catch (err) {
      console.error('Failed to retrieve Stripe charge:', err)
      return NextResponse.json({ error: 'Could not fetch receipt from Stripe' }, { status: 502 })
    }

    if (!receiptUrl) {
      return NextResponse.json({ error: 'Stripe did not return a receipt URL' }, { status: 404 })
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptUrl,
        stripeChargeId,
        cardLast4: cardLast4 || undefined,
        cardBrand: cardBrand || undefined,
      },
    })

    return NextResponse.json({ receiptUrl })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
