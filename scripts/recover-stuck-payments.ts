/**
 * Recovery script: reconcile Payment rows that Stripe charged but our webhook
 * failed to mark as succeeded.
 *
 * Background: registration/group/route.ts and registration/individual/route.ts
 * historically stored `checkoutSession.payment_intent` in Payment.stripePaymentIntentId.
 * That field is null at session-creation time (the PaymentIntent doesn't exist
 * until the customer actually pays), so the row was inserted with NULL. When
 * the webhook later fired with the real pi_..., the lookup `where { ...,
 * stripePaymentIntentId: pi_... }` matched zero rows, so paymentStatus stayed
 * 'pending', PaymentBalance.amountPaid stayed 0, and the confirmation email went
 * out with "$0.00 deposit paid".
 *
 * This script finds every pending Payment that was actually paid at Stripe and
 * brings the DB back in sync. It is idempotent and safe to run repeatedly.
 *
 *   Dry run (default):  npx tsx scripts/recover-stuck-payments.ts
 *   Apply changes:      DRY_RUN=false npx tsx scripts/recover-stuck-payments.ts
 *   Also resend emails: DRY_RUN=false RESEND_EMAILS=true npx tsx scripts/recover-stuck-payments.ts
 *   Single registration: REGISTRATION_ID=<uuid> npx tsx scripts/recover-stuck-payments.ts
 */

import { prisma } from '../src/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { generateGroupRegistrationConfirmationEmail } from '../src/lib/email-templates'
import { resolveReplyTo } from '../src/lib/email-reply-to'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const resend = new Resend(process.env.RESEND_API_KEY)

const DRY_RUN = process.env.DRY_RUN !== 'false'
const RESEND_EMAILS = process.env.RESEND_EMAILS === 'true'
const SINGLE_REGISTRATION = process.env.REGISTRATION_ID || null

type Outcome = 'fixed' | 'already_ok' | 'no_stripe_session' | 'not_succeeded_at_stripe' | 'no_balance_row' | 'error'

async function findStripePaymentIntentForRegistration(
  registrationId: string,
  existingId: string | null,
  paymentCreatedAt: Date,
): Promise<string | null> {
  // If we already have a pi_, trust it.
  if (existingId?.startsWith('pi_')) return existingId

  // If we have a cs_, resolve via the session.
  if (existingId?.startsWith('cs_')) {
    try {
      const session = await stripe.checkout.sessions.retrieve(existingId, { expand: ['payment_intent'] })
      const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
      return pi ?? null
    } catch (err: any) {
      console.warn(`  ⚠️ could not retrieve session ${existingId}: ${err.message}`)
      return null
    }
  }

  // Stored value is NULL — list checkout sessions created around the same time
  // and filter by metadata.registrationId. Stripe's Node SDK doesn't expose
  // sessions.search in older versions, so we use list with a tight created
  // window (Payment row's createdAt ± 1 day). Walks up to 5 pages of 100.
  const oneDay = 24 * 60 * 60
  const createdSec = Math.floor(paymentCreatedAt.getTime() / 1000)
  try {
    let startingAfter: string | undefined
    for (let page = 0; page < 5; page++) {
      const list = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: createdSec - oneDay, lte: createdSec + oneDay },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      for (const session of list.data) {
        if (session.metadata?.registrationId !== registrationId) continue
        if (!session.payment_intent) continue
        return typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
      }
      if (!list.has_more) break
      startingAfter = list.data[list.data.length - 1]?.id
      if (!startingAfter) break
    }
    return null
  } catch (err: any) {
    console.warn(`  ⚠️ stripe list failed for registration ${registrationId}: ${err.message}`)
    return null
  }
}

async function recoverPayment(payment: { id: string; registrationId: string; registrationType: string; amount: any; stripePaymentIntentId: string | null; createdAt: Date }): Promise<Outcome> {
  const pi = await findStripePaymentIntentForRegistration(payment.registrationId, payment.stripePaymentIntentId, payment.createdAt)
  if (!pi) return 'no_stripe_session'

  let paymentIntent: Stripe.PaymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(pi)
  } catch (err: any) {
    console.warn(`  ⚠️ could not retrieve payment intent ${pi}: ${err.message}`)
    return 'error'
  }

  if (paymentIntent.status !== 'succeeded') {
    console.log(`  ↳ pi ${pi} status = ${paymentIntent.status}, not recoverable`)
    return 'not_succeeded_at_stripe'
  }

  // Pull receipt/card info from the latest charge for parity with the webhook.
  let receiptUrl: string | null = null
  let stripeChargeId: string | null = null
  let cardLast4: string | null = null
  let cardBrand: string | null = null
  if (paymentIntent.latest_charge) {
    try {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
      receiptUrl = charge.receipt_url || null
      stripeChargeId = charge.id
      cardLast4 = charge.payment_method_details?.card?.last4 || null
      cardBrand = charge.payment_method_details?.card?.brand || null
    } catch {
      /* non-fatal */
    }
  }

  const balance = await prisma.paymentBalance.findUnique({ where: { registrationId: payment.registrationId } })
  if (!balance) {
    console.log(`  ↳ no PaymentBalance row for registration ${payment.registrationId}`)
    return 'no_balance_row'
  }

  const stripeAmountPaid = paymentIntent.amount_received / 100
  const newAmountPaid = stripeAmountPaid // single-payment recovery; balance is recomputed below if there are other rows
  const newAmountRemaining = Number(balance.totalAmountDue) - newAmountPaid

  console.log(`  ↳ will mark Payment ${payment.id} succeeded with pi=${pi}, amount=$${stripeAmountPaid}`)
  console.log(`  ↳ will set PaymentBalance amountPaid=$${newAmountPaid}, amountRemaining=$${newAmountRemaining}`)

  if (DRY_RUN) return 'fixed'

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: 'succeeded',
        processedAt: paymentIntent.created ? new Date(paymentIntent.created * 1000) : new Date(),
        stripePaymentIntentId: pi,
        stripeChargeId,
        receiptUrl,
        cardLast4,
        cardBrand,
      },
    })

    // Recompute from all succeeded payments for safety (idempotent).
    const allSucceeded = await tx.payment.findMany({
      where: { registrationId: payment.registrationId, paymentStatus: 'succeeded' },
      select: { amount: true },
    })
    const totalPaid = allSucceeded.reduce((s, p) => s + Number(p.amount), 0)
    const remaining = Number(balance.totalAmountDue) - totalPaid

    await tx.paymentBalance.update({
      where: { registrationId: payment.registrationId },
      data: {
        amountPaid: totalPaid,
        amountRemaining: remaining,
        lastPaymentDate: new Date(),
        paymentStatus: remaining <= 0 ? 'paid_full' : 'partial',
      },
    })

    if (payment.registrationType === 'group') {
      await tx.groupRegistration.updateMany({
        where: { id: payment.registrationId, registrationStatus: { in: ['incomplete', 'pending_payment'] } },
        data: { registrationStatus: 'pending_forms' },
      })
    } else if (payment.registrationType === 'individual') {
      await tx.individualRegistration.updateMany({
        where: { id: payment.registrationId, registrationStatus: { in: ['incomplete', 'pending_payment'] } },
        data: { registrationStatus: 'complete' },
      })
    }
  })

  if (RESEND_EMAILS && payment.registrationType === 'group') {
    await resendGroupConfirmationEmail(payment.registrationId)
  }

  return 'fixed'
}

async function resendGroupConfirmationEmail(registrationId: string) {
  const registration = await prisma.groupRegistration.findUnique({
    where: { id: registrationId },
    include: {
      event: { include: { settings: true, organization: { select: { id: true, name: true, contactEmail: true } } } },
    },
  })
  if (!registration) return

  const paymentBalance = await prisma.paymentBalance.findUnique({ where: { registrationId } })
  const depositPaid = paymentBalance ? Number(paymentBalance.amountPaid) : 0
  const totalAmount = paymentBalance ? Number(paymentBalance.totalAmountDue) : 0
  const balanceRemaining = paymentBalance ? Number(paymentBalance.amountRemaining) : 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
  const emailHtml = generateGroupRegistrationConfirmationEmail({
    groupName: registration.groupName,
    groupLeaderName: registration.groupLeaderName,
    eventName: registration.event.name,
    accessCode: registration.accessCode,
    confirmationPageUrl: `${appUrl}/registration/confirmation/${registration.id}`,
    totalParticipants: registration.totalParticipants,
    totalAmount,
    depositAmount: depositPaid,
    balanceRemaining,
    paymentMethod: 'card',
    registrationInstructions: registration.event.settings?.registrationInstructions || undefined,
    customMessage: registration.event.settings?.confirmationEmailMessage || undefined,
    organizationName: registration.event.organization.name,
    porosLiabilityUrl: `${appUrl}/poros?code=${registration.accessCode}`,
    groupLeaderPortalUrl: `${appUrl}/dashboard/group-leader`,
  })

  await resend.emails.send({
    from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
    reply_to: resolveReplyTo(registration.event.settings, registration.event.organization),
    to: registration.groupLeaderEmail,
    subject: `Payment Confirmed - ${registration.event.name}`,
    html: emailHtml,
  })
  console.log(`  ✉️  resent confirmation email to ${registration.groupLeaderEmail}`)
}

async function main() {
  console.log(`\n🔧 Stuck-payment recovery — DRY_RUN=${DRY_RUN} RESEND_EMAILS=${RESEND_EMAILS}${SINGLE_REGISTRATION ? ` REGISTRATION_ID=${SINGLE_REGISTRATION}` : ''}\n`)

  // Candidates: pending Payment rows where the stripe id is missing or is a cs_
  // (both indicate the broken create-time write).
  const candidates = await prisma.payment.findMany({
    where: {
      paymentStatus: 'pending',
      paymentMethod: 'card',
      ...(SINGLE_REGISTRATION ? { registrationId: SINGLE_REGISTRATION } : {}),
      OR: [
        { stripePaymentIntentId: null },
        { stripePaymentIntentId: { startsWith: 'cs_' } },
      ],
    },
    select: {
      id: true,
      registrationId: true,
      registrationType: true,
      amount: true,
      stripePaymentIntentId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${candidates.length} candidate Payment row(s)\n`)

  const counts: Record<Outcome, number> = {
    fixed: 0, already_ok: 0, no_stripe_session: 0, not_succeeded_at_stripe: 0, no_balance_row: 0, error: 0,
  }

  for (const p of candidates) {
    console.log(`Payment ${p.id} (${p.registrationType} ${p.registrationId}, $${p.amount}, ${p.stripePaymentIntentId ?? 'NULL'})`)
    try {
      const outcome = await recoverPayment(p as any)
      counts[outcome]++
    } catch (err: any) {
      console.error(`  ❌ ${err.message}`)
      counts.error++
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Summary:`)
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`)
  if (DRY_RUN && counts.fixed > 0) {
    console.log('\nRun with DRY_RUN=false to apply. Add RESEND_EMAILS=true to also resend the confirmation email.')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
