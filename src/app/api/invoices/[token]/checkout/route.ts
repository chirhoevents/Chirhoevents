import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Public endpoint - creates Stripe checkout session for invoice payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        paymentToken: token,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            stripeCustomerId: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if invoice is already paid or cancelled
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'This invoice has already been paid' },
        { status: 400 }
      )
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This invoice has been cancelled' },
        { status: 400 }
      )
    }

    // Get invoice type label for display
    const invoiceTypeLabels: Record<string, string> = {
      setup_fee: 'Setup Fee',
      subscription: 'Subscription',
      reactivation_fee: 'Reactivation Fee',
      custom: 'Custom',
    }
    const typeLabel = invoiceTypeLabels[invoice.invoiceType] || invoice.invoiceType

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    if (invoice.lineItems && Array.isArray(invoice.lineItems)) {
      // Use actual line items if available
      const items = invoice.lineItems as Array<{ description: string; amount: number }>
      for (const item of items) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.description,
            },
            unit_amount: Math.round(item.amount * 100), // Convert to cents
          },
          quantity: 1,
        })
      }
    } else {
      // Create a single line item for the total amount
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice #${invoice.invoiceNumber} - ${typeLabel}`,
            description: invoice.description || `${invoice.organization.name} - ${typeLabel}`,
          },
          unit_amount: Math.round(Number(invoice.amount) * 100), // Convert to cents
        },
        quantity: 1,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    const sharedMetadata = {
      type: 'platform_invoice',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber.toString(),
      organizationId: invoice.organizationId,
      invoiceType: invoice.invoiceType,
      paymentToken: token,
    }

    // For setup fee payments, save the card so we can start the subscription automatically
    const isSetupFee = invoice.invoiceType === 'setup_fee'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/pay/invoice/${token}?success=true`,
      cancel_url: `${appUrl}/pay/invoice/${token}?cancelled=true`,
      metadata: sharedMetadata,
      payment_intent_data: {
        setup_future_usage: isSetupFee ? 'off_session' : undefined,
        metadata: sharedMetadata,
      },
    }

    // Use the existing Stripe customer if we have one, otherwise fall back to email pre-fill
    if (invoice.organization.stripeCustomerId) {
      sessionParams.customer = invoice.organization.stripeCustomerId
    } else {
      sessionParams.customer_email = invoice.organization.contactEmail
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Store the checkout session ID on the invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Create checkout session error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
