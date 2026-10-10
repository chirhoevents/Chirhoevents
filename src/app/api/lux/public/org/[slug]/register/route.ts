import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findLuxOrgBySlug } from '@/lib/lux/public-org'
import { parseLuxSettings } from '@/lib/lux/settings'
import { clientIp, luxAudit } from '@/lib/lux/access'
import { createFamilySession, getFamilySession, setFamilyCookie } from '@/lib/lux/family-session'
import { cancelUnpaidOrders, parseFamilyInput, registerFamily, RegistrationError } from '@/lib/lux/family-registration'
import { sendOrderConfirmation } from '@/lib/lux/order-emails'
import { createConnectCheckoutSession, STRIPE_MINIMUM_CHARGE_CENTS } from '@/lib/lux/stripe-checkout'
import { appUrl } from '@/lib/lux/email'

type Params = { params: Promise<{ slug: string }> }

/**
 * POST /api/lux/public/org/[slug]/register
 * A family registers one or more children for the parish's programs.
 * Returns the documents each child still needs (the browser uploads them
 * next) and, for card payments, the Stripe checkout to send them to.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const org = await findLuxOrgBySlug(slug)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = parseFamilyInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const session = await getFamilySession(request)
  let result
  try {
    result = await registerFamily({
      organizationId: org.id,
      input: parsed.value,
      session,
      rules: parseLuxSettings(org.luxSettings).feeRules,
      paymentsReady: org.paymentsReady,
    })
  } catch (error) {
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('[Lux family register]', error)
    return NextResponse.json({ error: 'Something went wrong saving your registration. Please try again.' }, { status: 500 })
  }

  await luxAudit({
    organizationId: org.id,
    actorHouseholdId: result.householdId,
    action: 'family.registered',
    targetType: 'lux_order',
    targetId: result.orderId,
    metadata: { children: parsed.value.children.length, total: result.total, status: result.status },
    ip: clientIp(request),
  })

  let checkoutUrl: string | null = null
  if (result.status === 'pending_payment') {
    if (Math.round(result.total * 100) < STRIPE_MINIMUM_CHARGE_CENTS) {
      await cancelUnpaidOrders([result.orderId])
      return NextResponse.json({ error: 'Card payments must be at least $0.50. Please choose to pay at the office.' }, { status: 400 })
    }
    try {
      const { session: checkout, platformFeeCents } = await createConnectCheckoutSession({
        organization: org,
        lineItems: result.quote.lines
          .filter(l => l.total > 0)
          .map(l => ({ name: `${l.programName}: ${l.childName}`, amountCents: Math.round(l.total * 100), quantity: 1 })),
        metadata: { registrationId: result.orderId, registrationType: 'lux_order', organizationId: org.id },
        successUrl: appUrl(`/lux/${slug}/registered/${result.orderId}?t=${result.payToken}&session_id={CHECKOUT_SESSION_ID}`),
        cancelUrl: appUrl(`/lux/${slug}/pay/${result.orderId}?t=${result.payToken}&cancelled=1`),
        customerEmail: parsed.value.household.email,
      })
      await prisma.payment.create({
        data: {
          organizationId: org.id,
          eventId: null,
          registrationId: result.orderId,
          registrationType: 'lux_order',
          amount: result.total,
          paymentType: 'balance',
          paymentMethod: 'card',
          paymentStatus: 'pending',
          stripePaymentIntentId: checkout.id,
          platformFeeAmount: platformFeeCents / 100,
          processedVia: 'online',
        },
      })
      checkoutUrl = checkout.url
    } catch (error) {
      console.error('[Lux family register] Stripe checkout failed', error)
      await cancelUnpaidOrders([result.orderId])
      return NextResponse.json({ error: 'We couldn’t start the card payment. Please try again or choose to pay at the office.' }, { status: 502 })
    }
  } else {
    await sendOrderConfirmation(result.orderId)
  }

  const response = NextResponse.json({
    success: true,
    orderId: result.orderId,
    confirmationCode: result.confirmationCode,
    payToken: result.payToken,
    status: result.status,
    total: result.total,
    checkoutUrl,
    uploads: result.uploads,
  })

  // Let this browser upload the documents it just listed. A family that was
  // already on file (and isn't signed in) only gets access to this order.
  const keepExisting = session && session.organizationId === org.id && session.householdId === result.householdId && !session.orderId
  if (!keepExisting) {
    const { token, expiresAt } = await createFamilySession({
      organizationId: org.id,
      householdId: result.householdId,
      orderId: result.sessionScope === 'order' ? result.orderId : null,
    })
    setFamilyCookie(response, token, expiresAt)
  }
  return response
}
