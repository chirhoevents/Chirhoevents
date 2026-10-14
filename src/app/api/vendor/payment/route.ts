import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { recordVendorPayment, vendorPaymentsGoToPlatform } from '@/lib/vendor-payments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

async function findVendor(accessCode: string) {
  return prisma.vendorRegistration.findUnique({
    where: { accessCode },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          organization: {
            select: { stripeAccountId: true },
          },
        },
      },
    },
  })
}

// Which Stripe account collects this vendor's booth payment: the ChiRho
// platform account for Mount 2000, otherwise the org's connected account.
// Returns undefined for the platform account, null if the org isn't set up.
function resolveStripeAccount(vendor: NonNullable<Awaited<ReturnType<typeof findVendor>>>) {
  if (vendorPaymentsGoToPlatform(vendor.eventId)) return undefined
  return vendor.event.organization.stripeAccountId || null
}

// Create a Stripe Checkout session for the vendor's outstanding balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessCode } = body

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    const vendor = await findVendor(accessCode)

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status !== 'approved') {
      return NextResponse.json({ error: 'Vendor not approved for payment' }, { status: 403 })
    }

    const totalDue = vendor.invoiceTotal ? Number(vendor.invoiceTotal) : 0
    const amountPaid = Number(vendor.amountPaid || 0)
    const balance = totalDue - amountPaid
    const balanceCents = Math.round(balance * 100)

    if (balanceCents <= 0) {
      return NextResponse.json({ error: 'There is no balance due' }, { status: 400 })
    }

    const stripeAccountId = resolveStripeAccount(vendor)
    if (stripeAccountId === null) {
      return NextResponse.json(
        { error: 'Payment processing is not configured for this organization' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const dashboardUrl = `${appUrl}/vendor-dashboard?code=${encodeURIComponent(accessCode)}`

    const metadata = {
      type: 'vendor_payment',
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      eventId: vendor.eventId,
      paidTo: stripeAccountId ? 'organization' : 'platform',
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: vendor.email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Vendor booth - ${vendor.event.name}`,
                description: vendor.businessName,
              },
              unit_amount: balanceCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${dashboardUrl}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${dashboardUrl}&payment=cancelled`,
        metadata,
        payment_intent_data: {
          description: `Vendor booth payment - ${vendor.businessName} for ${vendor.event.name}`,
          metadata,
        },
      },
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating vendor payment session:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// Confirm a completed Checkout session when the vendor returns to the
// dashboard (the Stripe webhook records it too; recording is idempotent).
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessCode, sessionId } = body

    if (!accessCode || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const vendor = await findVendor(accessCode)

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const stripeAccountId = resolveStripeAccount(vendor)
    if (stripeAccountId === null) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    )

    if (session.metadata?.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Payment does not belong to this vendor' }, { status: 403 })
    }

    if (session.payment_status !== 'paid' || !session.payment_intent) {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const result = await recordVendorPayment(
      vendor.id,
      session.payment_intent as string,
      (session.amount_total || 0) / 100
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error confirming vendor payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
