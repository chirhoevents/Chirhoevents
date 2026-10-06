import Stripe from 'stripe'
import { prismaIncludingCancelled as prisma } from '@/lib/prisma'
import {
  incrementOptionCapacity,
  incrementDayPassOptionCapacity,
  type HousingType,
  type RoomType,
} from '@/lib/option-capacity'
import {
  releaseRegistrationAssignments,
  deleteRegistrationPermanently,
} from '@/lib/registration-cleanup'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

type RegistrationKind = 'group' | 'individual'

export type AbandonCheckoutResult =
  // The person actually paid — send them to their confirmation page
  | { status: 'paid' }
  // The unpaid registration was removed and its spots given back
  | { status: 'released' }
  // Nothing to do (already gone, or no longer an unpaid card checkout)
  | { status: 'skipped'; reason: string }

/**
 * Undo a card registration whose Stripe checkout was never paid.
 *
 * The card flow creates the registration (and takes its capacity) before
 * sending the person to Stripe. If they back out and pay by check instead,
 * or retry, a second registration would be created while the first one sits
 * there holding spots. The review page calls this first so only the new
 * registration remains.
 *
 * Safety: only acts on registrations still `incomplete` with nothing paid,
 * and expires the Stripe session first so it can't be paid afterwards. If
 * Stripe says the session was already paid, nothing is touched.
 */
export async function abandonUnpaidCheckout(
  type: RegistrationKind,
  registrationId: string,
  options: {
    /**
     * Also release an unpaid registration that never got a Stripe checkout
     * (no payment rows at all), e.g. one left behind when creating the
     * checkout failed. Only the stale-checkout sweep sets this.
     */
    releaseWithoutCheckout?: boolean
  } = {}
): Promise<AbandonCheckoutResult> {
  const registration =
    type === 'group'
      ? await prisma.groupRegistration.findUnique({
          where: { id: registrationId },
          select: {
            eventId: true,
            organizationId: true,
            registrationStatus: true,
            cancelledAt: true,
            totalParticipants: true,
            housingType: true,
            ticketType: true,
            dayPassOptionId: true,
          },
        })
      : await prisma.individualRegistration.findUnique({
          where: { id: registrationId },
          select: {
            eventId: true,
            organizationId: true,
            registrationStatus: true,
            cancelledAt: true,
            housingType: true,
            roomType: true,
            ticketType: true,
            dayPassOptionId: true,
          },
        })

  if (!registration) return { status: 'skipped', reason: 'not_found' }
  if (registration.cancelledAt) return { status: 'skipped', reason: 'cancelled' }
  if (registration.registrationStatus !== 'incomplete') {
    // complete / pending_forms means the webhook already recorded payment
    if (
      registration.registrationStatus === 'complete' ||
      registration.registrationStatus === 'pending_forms'
    ) {
      return { status: 'paid' }
    }
    return { status: 'skipped', reason: `status_${registration.registrationStatus}` }
  }

  const payments = await prisma.payment.findMany({
    where: { registrationId, registrationType: type },
    select: { paymentStatus: true, paymentMethod: true, stripePaymentIntentId: true },
  })
  if (payments.some(p => p.paymentStatus === 'succeeded')) return { status: 'paid' }

  const balance = await prisma.paymentBalance.findFirst({
    where: { registrationId, registrationType: type },
    select: { amountPaid: true },
  })
  if (balance && Number(balance.amountPaid) > 0) return { status: 'paid' }

  const sessionId = payments.find(
    p => p.paymentMethod === 'card' && p.stripePaymentIntentId?.startsWith('cs_')
  )?.stripePaymentIntentId
  if (!sessionId && !(options.releaseWithoutCheckout && payments.length === 0)) {
    return { status: 'skipped', reason: 'no_checkout_session' }
  }

  // Claim the registration first (incomplete → expired) so a concurrent
  // call, or Stripe's checkout.session.expired webhook (which skips
  // non-incomplete registrations), can't release the same spots twice.
  const setStatus = (from: 'incomplete' | 'expired', to: 'incomplete' | 'expired') => {
    const args = {
      where: { id: registrationId, registrationStatus: from },
      data: { registrationStatus: to },
    }
    return type === 'group'
      ? prisma.groupRegistration.updateMany(args)
      : prisma.individualRegistration.updateMany(args)
  }
  const claimed = await setStatus('incomplete', 'expired')
  if (claimed.count === 0) return { status: 'skipped', reason: 'already_claimed' }

  // Put it back if we end up not releasing it. The payment webhook sets the
  // status unconditionally, so this only matters when nothing was paid.
  const unclaim = () => setStatus('expired', 'incomplete')

  // Close the Stripe checkout so the old link can't be paid later. If it
  // turns out it was paid in the meantime, leave the registration alone.
  if (sessionId) {
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.status === 'open') {
        try {
          session = await stripe.checkout.sessions.expire(sessionId)
        } catch {
          session = await stripe.checkout.sessions.retrieve(sessionId)
        }
      }
    } catch (error) {
      await unclaim()
      throw error
    }
    if (session.status === 'complete' || session.payment_status === 'paid') {
      await unclaim()
      return { status: 'paid' }
    }
    if (session.status !== 'expired') {
      await unclaim()
      return { status: 'skipped', reason: `session_${session.status}` }
    }
  }

  // Give back what the registration route took, mirroring its decrements.
  const count = type === 'group' ? (registration as { totalParticipants: number }).totalParticipants || 0 : 1
  const roomType = type === 'individual' ? ((registration as { roomType: string | null }).roomType as RoomType | null) : null

  if (registration.ticketType === 'day_pass') {
    if (registration.dayPassOptionId) {
      await incrementDayPassOptionCapacity(registration.dayPassOptionId, count)
    }
  } else if (registration.housingType) {
    await incrementOptionCapacity(registration.eventId, registration.housingType as HousingType, roomType, count)
  }

  await prisma.$executeRaw`
    UPDATE events
    SET capacity_remaining = LEAST(capacity_total, capacity_remaining + ${count})
    WHERE id = ${registration.eventId}::uuid AND capacity_remaining IS NOT NULL
  `
  await prisma.organization.update({
    where: { id: registration.organizationId },
    data: { registrationsUsed: { decrement: count } },
  })

  // It was never a real registration, so remove it entirely rather than
  // leaving a cancelled row in the admin's list.
  await releaseRegistrationAssignments(type, registrationId)
  await deleteRegistrationPermanently(type, registrationId)

  return { status: 'released' }
}

/**
 * Release individual card registrations still unpaid long after their Stripe
 * checkout should have expired. Stripe's checkout.session.expired webhook
 * normally does this; the sweep catches anything it missed (a webhook not
 * delivered, or not subscribed in the Stripe dashboard) and registrations left
 * behind before individual checkouts were released at all. Anything Stripe
 * says was paid is left alone and reported so it can be recovered by hand.
 */
export async function releaseStaleIndividualCheckouts({
  olderThanMinutes = 120,
  limit = 50,
}: { olderThanMinutes?: number; limit?: number } = {}) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)
  const stale = await prisma.individualRegistration.findMany({
    where: { registrationStatus: 'incomplete', cancelledAt: null, createdAt: { lt: cutoff } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  const summary = { checked: stale.length, released: 0, paid: [] as string[], skipped: 0, failed: 0 }
  for (const { id } of stale) {
    try {
      const result = await abandonUnpaidCheckout('individual', id, { releaseWithoutCheckout: true })
      if (result.status === 'released') summary.released++
      else if (result.status === 'paid') summary.paid.push(id)
      else summary.skipped++
    } catch (error) {
      summary.failed++
      console.error(`[Stale checkouts] Failed to release individual registration ${id}:`, error)
    }
  }
  if (summary.paid.length > 0) {
    console.error('[Stale checkouts] Paid in Stripe but still incomplete (webhook missed?):', summary.paid)
  }
  return summary
}
