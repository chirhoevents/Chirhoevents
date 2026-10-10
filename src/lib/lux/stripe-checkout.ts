import Stripe from 'stripe'
import { calculatePlatformFeeCents } from '@/lib/stripe-fees'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Stripe's smallest card charge in USD
export const STRIPE_MINIMUM_CHARGE_CENTS = 50
// How long an unpaid checkout holds its spots before Stripe expires it and the
// checkout.session.expired webhook gives them back (Stripe allows 30 min - 24 h)
export const CHECKOUT_HOLD_SECONDS = 60 * 60

export interface ConnectCheckoutInput {
  organization: { id: string; stripeAccountId: string | null; platformFeePercentage: unknown }
  lineItems: Array<{ name: string; description?: string; amountCents: number; quantity: number }>
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  customerEmail: string
}

/**
 * Stripe Checkout session paid to the parish's Connect account, the same way
 * every other ChiRho registration is charged: a destination charge with the
 * platform fee (which passes Stripe's processing fee through) taken as the
 * application fee. Completion is handled by checkout.session.completed in
 * /api/webhooks/stripe using the session metadata (like individual
 * registrations, nothing is put on the payment intent).
 */
export async function createConnectCheckoutSession(input: ConnectCheckoutInput) {
  if (!input.organization.stripeAccountId) {
    throw new Error('Organization has not connected Stripe')
  }
  const totalCents = input.lineItems.reduce((sum, item) => sum + item.amountCents * item.quantity, 0)
  const platformFeePercentage = Number(input.organization.platformFeePercentage) || 1
  const platformFeeCents = calculatePlatformFeeCents(totalCents, platformFeePercentage)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: input.lineItems
      .filter(item => item.quantity > 0 && item.amountCents > 0)
      .map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name, ...(item.description ? { description: item.description } : {}) },
          unit_amount: item.amountCents,
        },
        quantity: item.quantity,
      })),
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_HOLD_SECONDS,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    metadata: { ...input.metadata, platformFeeAmount: platformFeeCents.toString() },
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      on_behalf_of: input.organization.stripeAccountId,
      transfer_data: { destination: input.organization.stripeAccountId },
    },
  })

  return { session, totalCents, platformFeeCents }
}

export async function expireCheckoutSession(sessionId: string): Promise<void> {
  try {
    await stripe.checkout.sessions.expire(sessionId)
  } catch (error) {
    console.error('[Lux checkout] Could not expire session', sessionId, error)
  }
}

export async function retrieveCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId)
}
