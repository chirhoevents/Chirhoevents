/**
 * Lux simple events: pricing, open/closed rules, plan limits, registration
 * (capacity per ticket, office payment, free), cancel and abandoned checkout.
 *
 * Needs a test database: DATABASE_URL=postgresql://... npx tsx tests/lux/simple-events.test.ts
 */

import { check, section, finish, createOrg, deleteOrg, jsonRequest, futureDay } from './helpers'

async function main() {
  const { prisma } = await import('../../src/lib/prisma')
  const {
    calculateSimpleEventTotal, getSimpleEventStatus, parseSimpleEventConfig, simpleEventCloseAt,
  } = await import('../../src/lib/lux/simple-event')
  const { createSimpleEvent, updateSimpleEvent, validateSimpleEventInput, soldCounts } = await import('../../src/lib/lux/simple-event-server')
  const { getSimpleEventUsage, simpleEventLimitMessage } = await import('../../src/lib/lux/limits')
  const { releaseSimpleEventCapacity } = await import('../../src/lib/lux/registrations')
  const { abandonUnpaidCheckout } = await import('../../src/lib/abandoned-checkout')
  const { POST: register } = await import('../../src/app/api/lux/public/events/[slug]/register/route')
  const { resolveModuleAccess, luxSimpleEventLimit } = await import('../../src/lib/subscription-tiers')

  // ------------------------------------------------------------------
  section('Pricing')
  const options = [
    { id: 'a', name: 'Adult', price: 12.5, remaining: null, isActive: true },
    { id: 'c', name: 'Child', price: 0.1, remaining: 2, isActive: true },
    { id: 'x', name: 'Old', price: 5, remaining: null, isActive: false },
  ]
  const priced = calculateSimpleEventTotal(options, [{ optionId: 'a', quantity: 2 }, { optionId: 'c', quantity: 2 }], 10)
  check('adds tickets in cents (2×12.50 + 2×0.10 = 25.20)', priced.ok && priced.total === 25.2 && priced.quantity === 4, priced)
  check('merges repeated selections', (() => {
    const r = calculateSimpleEventTotal(options, [{ optionId: 'a', quantity: 1 }, { optionId: 'a', quantity: 1 }], 10)
    return r.ok && r.lines.length === 1 && r.lines[0].quantity === 2
  })())
  check('refuses more than a ticket type has left', !calculateSimpleEventTotal(options, [{ optionId: 'c', quantity: 3 }], 10).ok)
  check('refuses hidden ticket types', !calculateSimpleEventTotal(options, [{ optionId: 'x', quantity: 1 }], 10).ok)
  check('refuses more than the per-registration limit', !calculateSimpleEventTotal(options, [{ optionId: 'a', quantity: 6 }], 5).ok)
  check('refuses zero tickets', !calculateSimpleEventTotal(options, [{ optionId: 'a', quantity: 0 }], 5).ok)
  check('refuses negative or fractional quantities',
    !calculateSimpleEventTotal(options, [{ optionId: 'a', quantity: -1 }], 5).ok &&
    !calculateSimpleEventTotal(options, [{ optionId: 'a', quantity: 1.5 }], 5).ok)

  // ------------------------------------------------------------------
  section('Open / closed')
  const base = {
    isPublished: true, status: 'registration_open', startDate: '2026-11-20', endDate: '2026-11-20',
    startTime: '18:00', endTime: '20:00', timezone: 'America/Chicago', registrationOpenDate: null,
    registrationCloseDate: null, capacityRemaining: null as number | null,
  }
  const at = (iso: string) => new Date(iso)
  check('open before the event starts', getSimpleEventStatus(base, at('2026-11-20T23:00:00Z')) === 'open') // 5pm CST
  check('closes when the event starts (6pm Chicago = 00:00Z)', getSimpleEventStatus(base, at('2026-11-21T00:30:00Z')) === 'closed')
  check('ended after the end time', getSimpleEventStatus(base, at('2026-11-21T03:00:00Z')) === 'ended')
  check('no start time: open all of the event day',
    getSimpleEventStatus({ ...base, startTime: null, endTime: null }, at('2026-11-21T05:00:00Z')) === 'open') // 11pm CST on the 20th
  check('explicit close date wins',
    getSimpleEventStatus({ ...base, registrationCloseDate: '2026-11-18T12:00:00Z' }, at('2026-11-19T00:00:00Z')) === 'closed')
  check('full when no capacity is left', getSimpleEventStatus({ ...base, capacityRemaining: 0 }, at('2026-11-19T00:00:00Z')) === 'full')
  check('drafts are never open', getSimpleEventStatus({ ...base, isPublished: false, status: 'draft' }, at('2026-11-19T00:00:00Z')) === 'draft')
  check('manually closed', getSimpleEventStatus({ ...base, status: 'registration_closed' }, at('2026-11-19T00:00:00Z')) === 'closed')
  check('close time is the start time in the event time zone',
    simpleEventCloseAt(base).toISOString() === '2026-11-21T00:00:00.000Z', simpleEventCloseAt(base).toISOString())

  // ------------------------------------------------------------------
  section('Plans')
  check('Chapel is Lux-only', (() => { const m = resolveModuleAccess({}, 'chapel'); return m.lux && !m.events })())
  check('Parish is Lux-only', (() => { const m = resolveModuleAccess({}, 'parish'); return m.lux && !m.events })())
  check('Cathedral has Events and no Lux by default', (() => { const m = resolveModuleAccess({}, 'cathedral'); return !m.lux && m.events })())
  check('master admin can switch Lux on for Cathedral', resolveModuleAccess({ lux: true }, 'cathedral').lux)
  check('grandfathered Chapel org keeps Events', resolveModuleAccess({ events: true }, 'chapel').events)
  check('Chapel: 5 simple events, Parish: 10, Cathedral: unlimited',
    luxSimpleEventLimit({}, 'chapel') === 5 && luxSimpleEventLimit({}, 'parish') === 10 && luxSimpleEventLimit({}, 'cathedral') === null)
  check('per-org override (including unlimited) beats the plan',
    luxSimpleEventLimit({ limits: { simpleEventsPerYear: 8 } }, 'chapel') === 8 &&
    luxSimpleEventLimit({ limits: { simpleEventsPerYear: null } }, 'chapel') === null)

  const { org, user } = await createOrg(prisma)
  try {
    // ------------------------------------------------------------------
    section('Creating and editing')
    const input = validateSimpleEventInput({
      title: 'Lenten Fish Fry',
      startDate: futureDay(10),
      startTime: '17:00',
      timezone: 'America/Chicago',
      capacity: 10,
      tickets: [
        { name: 'Adult', price: 12, capacity: null },
        { name: 'Child', price: 5, capacity: 3 },
      ],
      questions: [{ questionText: 'Meal choice', questionType: 'dropdown', options: ['Fish', 'Mac'], required: true }],
      config: { officePayment: { enabled: true, instructions: 'Pay at the office' }, onlinePayment: true, phoneField: 'optional' },
    })
    check('valid input is accepted', input.ok, !input.ok && input.error)
    if (!input.ok) throw new Error('input invalid')
    check('rejects paid tickets with no way to pay', !validateSimpleEventInput({
      title: 'X', startDate: futureDay(3), tickets: [{ name: 'A', price: 5 }],
      config: { onlinePayment: false, officePayment: { enabled: false } },
    }).ok)
    check('rejects choice questions without choices', !validateSimpleEventInput({
      title: 'X', startDate: futureDay(3), tickets: [{ name: 'A', price: 0 }],
      questions: [{ questionText: 'Pick', questionType: 'dropdown', options: ['One'] }],
    }).ok)

    const event = await createSimpleEvent({ organizationId: org.id, userId: user.id, input: input.value, hasRapha: false })
    const stored = await prisma.event.findUnique({ where: { id: event.id }, include: { settings: true, pricing: true, ticketOptions: true } })
    check('saved as a simple draft', stored?.mode === 'simple' && stored.status === 'draft' && !stored.isPublished)
    check('large-event options are off', !!stored?.settings && !stored.settings.groupRegistrationEnabled && !stored.settings.porosEnabled &&
      !stored.settings.staffRegistrationEnabled && !stored.settings.vendorRegistrationEnabled && stored.settings.individualRegistrationEnabled)
    check('full payment up front, no deposits', stored?.pricing?.requireFullPayment === true && stored.pricing.depositAmount === null)
    check('ticket types saved', stored?.ticketOptions.length === 2)

    // Publish the way the status route does
    await prisma.event.update({ where: { id: event.id }, data: { status: 'registration_open', isPublished: true, registrationOpenDate: new Date() } })
    const adult = stored!.ticketOptions.find(t => t.name === 'Adult')!
    const child = stored!.ticketOptions.find(t => t.name === 'Child')!
    const question = await prisma.customRegistrationQuestion.findFirst({ where: { eventId: event.id } })

    // ------------------------------------------------------------------
    section('Registering')
    const url = `http://localhost:3000/api/lux/public/events/${stored!.slug}/register`
    const call = async (body: unknown) => {
      const res = await register(jsonRequest(url, body), { params: Promise.resolve({ slug: stored!.slug }) })
      return { status: res.status, data: await res.json() }
    }
    const person = { firstName: 'Maria', lastName: 'Lopez', email: 'Maria@Example.com', phone: '555-0100' }

    let r = await call({ ...person, tickets: [{ optionId: adult.id, quantity: 2 }], answers: [], paymentMethod: 'office' })
    check('required question is enforced', r.status === 400 && /Meal choice/.test(r.data.error), r.data)

    r = await call({
      ...person,
      tickets: [{ optionId: adult.id, quantity: 2 }, { optionId: child.id, quantity: 2 }],
      answers: [{ questionId: question!.id, answerText: 'Fish' }],
      paymentMethod: 'office',
    })
    check('office registration succeeds', r.status === 200 && r.data.success && r.data.checkoutUrl === null, r.data)
    const reg1 = await prisma.individualRegistration.findUnique({ where: { id: r.data.registrationId } })
    const bal1 = await prisma.paymentBalance.findUnique({ where: { registrationId: r.data.registrationId } })
    check('one registration holds 4 tickets', reg1?.ticketQuantity === 4)
    check('email saved lowercased', reg1?.email === 'maria@example.com')
    check('pending office payment of $34', reg1?.registrationStatus === 'pending_payment' && Number(bal1?.totalAmountDue) === 34 &&
      bal1?.paymentStatus === 'pending_check_payment', { status: reg1?.registrationStatus, due: bal1?.totalAmountDue })
    let ev = await prisma.event.findUnique({ where: { id: event.id }, include: { ticketOptions: true } })
    check('event capacity went down by 4', ev?.capacityRemaining === 6, ev?.capacityRemaining)
    check('child tickets went down by 2', ev?.ticketOptions.find(t => t.id === child.id)?.remaining === 1)
    const answer = await prisma.customRegistrationAnswer.findFirst({ where: { registrationId: r.data.registrationId } })
    check('answer saved', answer?.answerText === 'Fish')
    const emailLog = await prisma.emailLog.findFirst({ where: { registrationId: r.data.registrationId } })
    check('a Lux confirmation email was attempted and logged', !!emailLog && emailLog.emailType === 'lux_event_confirmation_office', emailLog?.emailType)

    r = await call({ ...person, firstName: 'Ana', tickets: [{ optionId: child.id, quantity: 2 }], answers: [{ questionId: question!.id, answerText: 'Mac' }], paymentMethod: 'office' })
    check('refuses more child tickets than are left', r.status === 400, r.data)

    r = await call({ ...person, firstName: 'Big', tickets: [{ optionId: adult.id, quantity: 7 }], answers: [{ questionId: question!.id, answerText: 'Mac' }], paymentMethod: 'office' })
    check('refuses more than total capacity, nothing taken', r.status === 409, r.data)
    ev = await prisma.event.findUnique({ where: { id: event.id }, include: { ticketOptions: true } })
    check('capacity unchanged after the refusal', ev?.capacityRemaining === 6)

    r = await call({ ...person, email: 'not-an-email', tickets: [{ optionId: adult.id, quantity: 1 }], answers: [{ questionId: question!.id, answerText: 'Fish' }] })
    check('needs a valid email', r.status === 400)

    // ------------------------------------------------------------------
    section('Editing with sales')
    const edit = validateSimpleEventInput({ ...input.value, capacity: 3, tickets: input.value.tickets.map((t, i) => ({ ...t, id: i === 0 ? adult.id : child.id })) })
    const tooSmall = edit.ok ? await updateSimpleEvent({ organizationId: org.id, eventId: event.id, input: edit.value, hasRapha: false }) : null
    check('can’t shrink capacity below tickets sold', !!tooSmall && !tooSmall.ok, tooSmall)
    const removesAnswered = validateSimpleEventInput({ ...input.value, capacity: 12, questions: [], tickets: input.value.tickets.map((t, i) => ({ ...t, id: i === 0 ? adult.id : child.id })) })
    const blocked = removesAnswered.ok ? await updateSimpleEvent({ organizationId: org.id, eventId: event.id, input: removesAnswered.value, hasRapha: false }) : null
    check('can’t remove a question that already has answers', !!blocked && !blocked.ok && /already has answers/.test((blocked as { error: string }).error))
    const edit2 = validateSimpleEventInput({
      ...input.value,
      capacity: 12,
      tickets: input.value.tickets.map((t, i) => ({ ...t, id: i === 0 ? adult.id : child.id })),
      questions: input.value.questions.map(q => ({ ...q, id: question!.id, questionText: 'Meal choice (fish or mac)' })),
    })
    const ok = edit2.ok ? await updateSimpleEvent({ organizationId: org.id, eventId: event.id, input: edit2.value, hasRapha: false }) : null
    ev = await prisma.event.findUnique({ where: { id: event.id }, include: { ticketOptions: true } })
    check('growing capacity keeps sold count (12 - 4 = 8 left)', !!ok?.ok && ev?.capacityRemaining === 8, { ok, cap: ev?.capacityRemaining })
    const renamed = await prisma.customRegistrationQuestion.findUnique({ where: { id: question!.id } })
    check('question wording can still be edited', renamed?.questionText === 'Meal choice (fish or mac)')
    const sold = await soldCounts(event.id)
    check('sold counts by ticket type', sold.total === 4 && sold.byOption.get(child.id) === 2)

    // ------------------------------------------------------------------
    section('Cancelling and abandoned checkouts')
    await prisma.individualRegistration.update({ where: { id: reg1!.id }, data: { cancelledAt: new Date() } })
    await releaseSimpleEventCapacity(reg1!)
    ev = await prisma.event.findUnique({ where: { id: event.id }, include: { ticketOptions: true } })
    check('cancel gives back all 4 spots and 2 child tickets', ev?.capacityRemaining === 12 && ev.ticketOptions.find(t => t.id === child.id)?.remaining === 3,
      { cap: ev?.capacityRemaining, child: ev?.ticketOptions.find(t => t.id === child.id)?.remaining })

    // An unpaid card registration that never reached Stripe: the sweep releases all its tickets
    await prisma.$executeRaw`UPDATE events SET capacity_remaining = capacity_remaining - 3 WHERE id = ${event.id}::uuid`
    await prisma.$executeRaw`UPDATE event_ticket_options SET remaining = remaining - 3 WHERE id = ${child.id}::uuid`
    const stale = await prisma.individualRegistration.create({
      data: {
        eventId: event.id, organizationId: org.id, firstName: 'Stale', lastName: 'Card', email: 's@example.com', phone: '',
        emergencyContact1Name: '', emergencyContact1Phone: '', registrationStatus: 'incomplete', ticketQuantity: 3,
        ticketSelections: [{ optionId: child.id, name: 'Child', unitPrice: 5, quantity: 3, amount: 15 }],
      },
    })
    const released = await abandonUnpaidCheckout('individual', stale.id, { releaseWithoutCheckout: true })
    ev = await prisma.event.findUnique({ where: { id: event.id }, include: { ticketOptions: true } })
    check('abandoned checkout releases all 3 tickets', released.status === 'released' && ev?.capacityRemaining === 12 &&
      ev.ticketOptions.find(t => t.id === child.id)?.remaining === 3, { released, cap: ev?.capacityRemaining })

    // ------------------------------------------------------------------
    section('Free events')
    const freeInput = validateSimpleEventInput({ title: 'Bible Study', startDate: futureDay(5), tickets: [{ name: 'RSVP', price: 0 }], config: { phoneField: 'hidden' } })
    const freeEvent = freeInput.ok ? await createSimpleEvent({ organizationId: org.id, userId: user.id, input: freeInput.value, hasRapha: false }) : null
    await prisma.event.update({ where: { id: freeEvent!.id }, data: { status: 'registration_open', isPublished: true } })
    const freeOpt = await prisma.eventTicketOption.findFirst({ where: { eventId: freeEvent!.id } })
    const freeRes = await register(jsonRequest(`http://x/${freeEvent!.slug}`, { firstName: 'Jo', lastName: 'Ng', email: 'jo@example.com', tickets: [{ optionId: freeOpt!.id, quantity: 1 }] }),
      { params: Promise.resolve({ slug: freeEvent!.slug }) })
    const freeData = await freeRes.json()
    const freeReg = await prisma.individualRegistration.findUnique({ where: { id: freeData.registrationId } })
    check('free sign-up is complete right away, phone not required', freeRes.status === 200 && freeReg?.registrationStatus === 'complete', freeData)

    // ------------------------------------------------------------------
    section('Plan limit (Chapel = 5)')
    for (let i = 0; i < 3; i++) {
      const extra = validateSimpleEventInput({ title: `Extra ${i}`, startDate: futureDay(20 + i), tickets: [{ name: 'RSVP', price: 0 }] })
      const e = extra.ok ? await createSimpleEvent({ organizationId: org.id, userId: user.id, input: extra.value, hasRapha: false }) : null
      await prisma.event.update({ where: { id: e!.id }, data: { status: 'registration_open', isPublished: true } })
    }
    const draftInput = validateSimpleEventInput({ title: 'Draft only', startDate: futureDay(30), tickets: [{ name: 'RSVP', price: 0 }] })
    if (draftInput.ok) await createSimpleEvent({ organizationId: org.id, userId: user.id, input: draftInput.value, hasRapha: false })
    const usage = await getSimpleEventUsage(org.id)
    check('5 published simple events counted, draft not counted', usage.used === 5 && usage.limit === 5 && usage.remaining === 0, usage)
    check('publishing a 6th is blocked with a clear message', !!(await simpleEventLimitMessage(org.id, 'chapel'))?.includes('5 simple events'))
    await prisma.organization.update({ where: { id: org.id }, data: { luxSettings: { limits: { simpleEventsPerYear: 10 } } } })
    check('master admin override lifts the limit', (await simpleEventLimitMessage(org.id, 'chapel')) === null)
    const fullCount = await (await import('../../src/lib/event-usage')).countEventsUsedInCurrentPeriod(org.id, org.createdAt)
    check('simple events don’t count against the full-event limit', fullCount === 0, fullCount)
    check('parseSimpleEventConfig fills defaults', parseSimpleEventConfig(null).maxPerRegistration === 10)
  } finally {
    await deleteOrg(prisma, org.id)
    await prisma.$disconnect()
  }
  finish()
}

main().catch(err => { console.error(err); process.exit(1) })
