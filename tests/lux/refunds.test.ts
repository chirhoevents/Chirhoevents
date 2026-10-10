/**
 * Refunds on a real database: faith formation registrations (orders) and
 * simple event registrations, by cash/check and back to the card (with a
 * stand-in for Stripe). A refund gives back money the family no longer
 * owes, so it never leaves them with a new balance.
 *
 * Needs a test database: DATABASE_URL=postgresql://... npx tsx tests/lux/refunds.test.ts
 */

import { check, section, finish, createOrg, deleteOrg, jsonRequest, futureDay } from './helpers'

async function main() {
  const { prisma } = await import('../../src/lib/prisma')
  const { createProgram, validateProgramInput } = await import('../../src/lib/lux/program-server')
  const { getProgramTemplate } = await import('../../src/lib/lux/program-templates')
  const { parseFamilyInput, registerFamily } = await import('../../src/lib/lux/family-registration')
  const { parseFeeRules } = await import('../../src/lib/lux/family-fees')
  const { recordOrderOfficePayment, cancelProgramRegistration, OrderActionError } = await import('../../src/lib/lux/order-staff-actions')
  const { refundLuxPayment, refundableAmounts } = await import('../../src/lib/lux/refunds')
  const { createSimpleEvent, validateSimpleEventInput } = await import('../../src/lib/lux/simple-event-server')
  const { POST: registerForEvent } = await import('../../src/app/api/lux/public/events/[slug]/register/route')
  type RefundStripe = import('../../src/lib/lux/refunds').RefundStripe

  // Stand-in for Stripe: each payment intent has a charge and what's been refunded on it
  const charges = new Map<string, { amount: number; refunded: number }>()
  const stripeCalls: Array<{ paymentIntentId: string; amountCents: number; idempotencyKey: string }> = []
  const refundsByKey = new Map<string, string>()
  const fakeStripe: RefundStripe = {
    async refundable(pi) {
      const c = charges.get(pi)
      return c ? c.amount - c.refunded : 0
    },
    async refund({ paymentIntentId, amountCents, idempotencyKey }) {
      const existing = refundsByKey.get(idempotencyKey)
      if (existing) return existing
      const c = charges.get(paymentIntentId)!
      if (amountCents > c.amount - c.refunded) throw new Error('Refund exceeds charge')
      c.refunded += amountCents
      stripeCalls.push({ paymentIntentId, amountCents, idempotencyKey })
      const id = `re_${stripeCalls.length}_${Date.now()}`
      refundsByKey.set(idempotencyKey, id)
      return id
    },
  }

  const { org, user } = await createOrg(prisma, { publicSlug: `refunds-${Date.now()}` })
  const fails = async (fn: () => Promise<unknown>, pattern: RegExp) => {
    try { await fn(); return false } catch (e) { return e instanceof OrderActionError && pattern.test(e.message) }
  }

  try {
    const t = getProgramTemplate('faith_formation')
    const parsed = validateProgramInput({ templateKey: 'faith_formation', ...t.defaults, term: '2026–2027', tuitionPerChild: 100 })
    if (!parsed.ok) throw new Error(parsed.error)
    const program = await createProgram(org.id, user.id, parsed.value)
    await prisma.luxProgram.update({ where: { id: program.id }, data: { status: 'open' } })
    const rules = parseFeeRules({})
    let n = 0
    const newOrder = async (kids: string[]) => {
      const input = parseFamilyInput({
        paymentMethod: 'office',
        household: { guardian1FirstName: 'Rosa', guardian1LastName: `Diaz${++n}`, email: `refund${n}-${Date.now()}@example.com`, phone: '555-0101' },
        children: kids.map((name, i) => ({ key: `k${i}`, firstName: name, grade: '3', programId: program.id, answers: { photo_permission: 'Yes' } })),
      })
      if (!input.ok) throw new Error(input.error)
      return registerFamily({ organizationId: org.id, input: input.value, session: null, rules, paymentsReady: false })
    }
    const order = (id: string) => prisma.luxOrder.findUniqueOrThrow({ where: { id } })

    section('Cash refund after a child withdraws')
    const a = await newOrder(['Ana', 'Ben'])
    check('two children, $200', a.total === 200, a.quote)
    await recordOrderOfficePayment({ organizationId: org.id, orderId: a.orderId, userId: user.id, amount: 200, method: 'check' })
    check('paid in full', (await order(a.orderId)).status === 'paid')
    check('can’t refund before choosing how',
      await fails(() => refundLuxPayment({ organizationId: org.id, kind: 'order', id: a.orderId, userId: user.id, amount: 50, method: 'wire' }), /how/))
    check('can’t refund more than was paid',
      await fails(() => refundLuxPayment({ organizationId: org.id, kind: 'order', id: a.orderId, userId: user.id, amount: 250, method: 'cash' }), /more than/))
    check('no card refund for a family who paid at the office',
      await fails(() => refundLuxPayment({ organizationId: org.id, kind: 'order', id: a.orderId, userId: user.id, amount: 50, method: 'card', stripeClient: fakeStripe }), /cash or check/))

    const regs = await prisma.luxProgramRegistration.findMany({ where: { orderId: a.orderId }, orderBy: { createdAt: 'asc' } })
    await cancelProgramRegistration({ organizationId: org.id, registrationId: regs[1].id, reason: 'Moved' })
    const r1 = await refundLuxPayment({
      organizationId: org.id, kind: 'order', id: a.orderId, userId: user.id, amount: 100, method: 'check', checkNumber: '1042', reason: 'withdrew',
    })
    const afterA = await order(a.orderId)
    check('the refund is recorded', r1.amount === 100 && !r1.toCard)
    check('paid goes down to $100 and the amount due follows', Number(afterA.amountPaid) === 100 && Number(afterA.amountDue) === 100, afterA)
    check('still paid in full; no new balance', afterA.status === 'paid')
    const row = await prisma.refund.findFirst({ where: { registrationId: a.orderId } })
    check('refund row has the check number and reason', row?.notes === 'Check #1042' && row.refundReason === 'participant_removed' && row.status === 'completed' && row.refundMethod === 'manual')
    check('refundable amounts reflect it', JSON.stringify(await refundableAmounts(org.id, 'order', a.orderId, fakeStripe)) === JSON.stringify({ paid: 100, toCard: 0 }))

    section('Refunding everything after the whole family withdraws')
    await cancelProgramRegistration({ organizationId: org.id, registrationId: regs[0].id })
    await refundLuxPayment({ organizationId: org.id, kind: 'order', id: a.orderId, userId: user.id, amount: 100, method: 'cash' })
    const emptied = await order(a.orderId)
    check('nothing paid, nothing due, cancelled', Number(emptied.amountPaid) === 0 && Number(emptied.amountDue) === 0 && emptied.status === 'cancelled', emptied)
    check('nothing left to refund', await fails(() => refundLuxPayment({ organizationId: org.id, kind: 'order', id: a.orderId, userId: user.id, amount: 1, method: 'cash' }), /Nothing has been paid/))

    section('Back to the card, across two card payments')
    const b = await newOrder(['Cruz'])
    // Two online card payments: $60 then $40
    for (const [i, amt] of [[1, 60], [2, 40]] as const) {
      const pi = `pi_test_${i}_${b.orderId.slice(0, 8)}`
      charges.set(pi, { amount: amt * 100, refunded: 0 })
      await prisma.payment.create({
        data: {
          organizationId: org.id, registrationId: b.orderId, registrationType: 'lux_order', amount: amt, paymentType: 'balance',
          paymentMethod: 'card', paymentStatus: 'succeeded', stripePaymentIntentId: pi, processedVia: 'online', processedAt: new Date(),
          createdAt: new Date(Date.now() - (3 - i) * 60000),
        },
      })
    }
    await (await import('../../src/lib/lux/order-payments')).recalculateOrder(b.orderId)
    check('paid by card', (await order(b.orderId)).status === 'paid')
    check('the whole $100 can go back to the card', (await refundableAmounts(org.id, 'order', b.orderId, fakeStripe)).toCard === 100)
    const r2 = await refundLuxPayment({ organizationId: org.id, kind: 'order', id: b.orderId, userId: user.id, amount: 70, method: 'card', stripeClient: fakeStripe })
    check('$70 refunded to the card', r2.amount === 70 && r2.toCard)
    check('taken from the newest payment first, then the older one',
      stripeCalls.length === 2 && stripeCalls[0].amountCents === 4000 && stripeCalls[1].amountCents === 3000, stripeCalls)
    const cardRows = await prisma.refund.findMany({ where: { registrationId: b.orderId }, orderBy: { createdAt: 'asc' } })
    check('one refund row per Stripe refund', cardRows.length === 2 && cardRows.every(r => r.refundMethod === 'stripe' && !!r.stripeRefundId))
    const afterB = await order(b.orderId)
    check('$30 still paid, $30 due, still paid in full', Number(afterB.amountPaid) === 30 && Number(afterB.amountDue) === 30 && afterB.status === 'paid', afterB)
    check('can’t send more to the card than is left on it',
      await fails(() => refundLuxPayment({ organizationId: org.id, kind: 'order', id: b.orderId, userId: user.id, amount: 30.01, method: 'card', stripeClient: fakeStripe }), /more than|Only/))

    section('A family who still owes keeps owing the same')
    const c = await newOrder(['Dani', 'Eli'])
    await recordOrderOfficePayment({ organizationId: org.id, orderId: c.orderId, userId: user.id, amount: 120, method: 'cash' })
    await refundLuxPayment({ organizationId: org.id, kind: 'order', id: c.orderId, userId: user.id, amount: 20, method: 'cash', reason: 'overpaid' })
    const afterC = await order(c.orderId)
    check('still owes $80; the amount due drops by the refund', Number(afterC.amountPaid) === 100 && Number(afterC.amountDue) === 180 && afterC.status === 'office_pending', afterC)

    section('Simple event registrations')
    const input = validateSimpleEventInput({
      title: 'Parish Picnic', startDate: futureDay(12), startTime: '12:00', timezone: 'America/Chicago',
      tickets: [{ name: 'Adult', price: 15, capacity: null }],
      config: { officePayment: { enabled: true, instructions: 'Office' }, onlinePayment: true },
    })
    if (!input.ok) throw new Error(input.error)
    const event = await createSimpleEvent({ organizationId: org.id, userId: user.id, input: input.value, hasRapha: false })
    const stored = await prisma.event.findUniqueOrThrow({ where: { id: event.id }, include: { ticketOptions: true } })
    await prisma.event.update({ where: { id: event.id }, data: { status: 'registration_open', isPublished: true, registrationOpenDate: new Date() } })
    const res = await registerForEvent(
      jsonRequest(`http://localhost:3000/api/lux/public/events/${stored.slug}/register`, {
        firstName: 'Luis', lastName: 'Ortiz', email: 'luis@example.com', phone: '555-0102',
        tickets: [{ optionId: stored.ticketOptions[0].id, quantity: 2 }], answers: [], paymentMethod: 'office',
      }),
      { params: Promise.resolve({ slug: stored.slug }) }
    )
    const { registrationId } = await res.json()
    await prisma.payment.create({
      data: {
        organizationId: org.id, eventId: event.id, registrationId, registrationType: 'individual', amount: 30, paymentType: 'balance',
        paymentMethod: 'cash', paymentStatus: 'succeeded', processedVia: 'manual', processedAt: new Date(),
      },
    })
    await (await import('../../src/lib/lux/registrations')).recalculateIndividualBalance(registrationId)
    await refundLuxPayment({ organizationId: org.id, kind: 'event', id: registrationId, userId: user.id, amount: 15, method: 'cash' })
    const bal = await prisma.paymentBalance.findUniqueOrThrow({ where: { registrationId } })
    check('half refunded: $15 paid of $15, nothing owed', Number(bal.amountPaid) === 15 && Number(bal.totalAmountDue) === 15 && Number(bal.amountRemaining) === 0, bal)
    await refundLuxPayment({ organizationId: org.id, kind: 'event', id: registrationId, userId: user.id, amount: 15, method: 'cash' })
    const bal2 = await prisma.paymentBalance.findUniqueOrThrow({ where: { registrationId } })
    check('fully refunded: marked refunded, nothing owed', Number(bal2.amountPaid) === 0 && Number(bal2.amountRemaining) === 0 && bal2.paymentStatus === 'refunded', bal2)

    section('Other parishes')
    const other = await createOrg(prisma)
    try {
      check('another parish can’t refund this family',
        await fails(() => refundLuxPayment({ organizationId: other.org.id, kind: 'order', id: b.orderId, userId: other.user.id, amount: 1, method: 'cash' }), /not found/))
    } finally {
      await deleteOrg(prisma, other.org.id)
    }
  } finally {
    await deleteOrg(prisma, org.id)
    await prisma.$disconnect()
  }
  finish()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
