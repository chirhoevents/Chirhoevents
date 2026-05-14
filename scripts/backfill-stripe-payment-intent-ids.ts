/**
 * Backfill script: fix Payment records that store cs_... (checkout session ID)
 * instead of pi_... (payment intent ID) in stripePaymentIntentId.
 *
 * Run dry-run first:  npx tsx scripts/backfill-stripe-payment-intent-ids.ts
 * Run live:           DRY_RUN=false npx tsx scripts/backfill-stripe-payment-intent-ids.ts
 */

import { prisma } from '../src/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const DRY_RUN = process.env.DRY_RUN !== 'false'

async function main() {
  console.log(`\n🔧 Stripe Payment Intent ID backfill — DRY_RUN=${DRY_RUN}\n`)

  // Find all Payment records where stripePaymentIntentId looks like a checkout session ID
  const payments = await prisma.payment.findMany({
    where: {
      stripePaymentIntentId: { startsWith: 'cs_' },
    },
    select: {
      id: true,
      registrationId: true,
      registrationType: true,
      stripePaymentIntentId: true,
    },
  })

  console.log(`Found ${payments.length} payment record(s) with cs_... IDs\n`)

  if (payments.length === 0) {
    console.log('✅ Nothing to backfill.')
    return
  }

  let fixed = 0
  let failed = 0

  for (const payment of payments) {
    const sessionId = payment.stripePaymentIntentId!
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      })

      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id

      if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
        console.log(`⚠️  ${payment.id}: session ${sessionId} has no payment intent (may be free or refunded) — skipping`)
        continue
      }

      console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}${payment.id}: ${sessionId} → ${paymentIntentId}`)

      if (!DRY_RUN) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: paymentIntentId },
        })
      }
      fixed++
    } catch (err: any) {
      console.error(`❌ ${payment.id} (${sessionId}): ${err.message}`)
      failed++
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Summary: ${fixed} would be fixed, ${failed} failed`)
  if (DRY_RUN && fixed > 0) {
    console.log('\nRun with DRY_RUN=false to apply changes.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
