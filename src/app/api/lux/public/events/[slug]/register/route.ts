import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateIndividualConfirmationCode } from '@/lib/access-code'
import { generateIndividualRegistrationQr } from '@/lib/individual-qr'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { resolveModuleAccess } from '@/lib/subscription-tiers'
import { deleteRegistrationPermanently } from '@/lib/registration-cleanup'
import { abandonUnpaidCheckout } from '@/lib/abandoned-checkout'
import { clientIp } from '@/lib/lux/access'
import {
  calculateSimpleEventTotal,
  getSimpleEventStatus,
  parseSimpleEventConfig,
} from '@/lib/lux/simple-event'
import { releaseTicketOptionCapacity } from '@/lib/lux/registrations'
import { appUrl, sendLuxEmail, simpleEventConfirmationEmail } from '@/lib/lux/email'
import {
  createConnectCheckoutSession,
  expireCheckoutSession,
  STRIPE_MINIMUM_CHARGE_CENTS,
} from '@/lib/lux/stripe-checkout'

type Params = { params: Promise<{ slug: string }> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * POST /api/lux/public/events/[slug]/register
 *
 * Registration for a Lux simple event. Creates a regular individual
 * registration (so payments, refunds and check-in work as for any event),
 * holding one spot per ticket. Card payments go through Stripe Checkout to
 * the parish's Connect account and are confirmed by the Stripe webhook;
 * "pay at the office" and free registrations are confirmed right away.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const rollback: Array<() => Promise<unknown>> = []
  const runRollback = async () => {
    for (const undo of rollback.splice(0).reverse()) {
      await undo().catch(err => console.error('[Lux register] Rollback step failed:', err))
    }
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const event = await prisma.event.findFirst({
      where: { slug, mode: 'simple' },
      include: {
        settings: { select: { contactEmail: true } },
        ticketOptions: { where: { isActive: true } },
        customRegistrationQuestions: true,
        organization: {
          select: {
            id: true, name: true, status: true, contactEmail: true, stripeAccountId: true,
            stripeChargesEnabled: true, platformFeePercentage: true, modulesEnabled: true, subscriptionTier: true,
          },
        },
      },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (event.organization.status !== 'active') {
      return NextResponse.json({ error: 'This parish is not taking registrations right now.' }, { status: 400 })
    }

    const status = getSimpleEventStatus(event)
    if (status !== 'open') {
      const messages: Record<string, string> = {
        draft: 'This event isn’t open for registration yet.',
        not_yet_open: 'Registration hasn’t opened yet.',
        full: 'Sorry, this event is full.',
        closed: 'Registration for this event is closed.',
        ended: 'This event has already happened.',
      }
      return NextResponse.json({ error: messages[status] || 'Registration is closed.' }, { status: 400 })
    }

    // Someone who backed out of Stripe and is registering again: drop the
    // unpaid registration first so they aren't registered twice
    if (typeof body.previousRegistrationId === 'string' && UUID_RE.test(body.previousRegistrationId)) {
      const result = await abandonUnpaidCheckout('individual', body.previousRegistrationId)
      if (result.status === 'paid') {
        return NextResponse.json({ alreadyPaid: true, registrationId: body.previousRegistrationId })
      }
    }

    const config = parseSimpleEventConfig(event.luxConfig)

    // --- Who's registering -------------------------------------------------
    const firstName = clean(body.firstName, 100)
    const lastName = clean(body.lastName, 100)
    const email = clean(body.email, 255).toLowerCase()
    const phone = clean(body.phone, 20)
    const street = clean(body.street, 255)
    const city = clean(body.city, 100)
    const state = clean(body.state, 2).toUpperCase()
    const zip = clean(body.zip, 10)
    if (!firstName || !lastName) return NextResponse.json({ error: 'Please enter your first and last name.' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address. We send your confirmation there.' }, { status: 400 })
    if (config.phoneField === 'required' && !phone) return NextResponse.json({ error: 'Please enter your phone number.' }, { status: 400 })
    if (config.addressField === 'required' && (!street || !city || !state || !zip)) {
      return NextResponse.json({ error: 'Please enter your full address.' }, { status: 400 })
    }

    // --- Questions ---------------------------------------------------------
    const answers = new Map<string, string>()
    for (const a of Array.isArray(body.answers) ? body.answers : []) {
      if (typeof a?.questionId === 'string') answers.set(a.questionId, clean(a.answerText, 5000))
    }
    for (const q of event.customRegistrationQuestions) {
      if (q.required && !answers.get(q.id)) {
        return NextResponse.json({ error: `Please answer: ${q.questionText}` }, { status: 400 })
      }
    }
    const validQuestionIds = new Set(event.customRegistrationQuestions.map(q => q.id))

    // --- Waiver & medical ---------------------------------------------------
    const luxDetails: Record<string, unknown> = {}
    const lang = body.language === 'es' ? 'es' : 'en'
    if (lang === 'es') luxDetails.lang = 'es'
    if (config.waiver.enabled) {
      const signedName = clean(body.waiverSignature, 200)
      if (!signedName || body.waiverAccepted !== true) {
        return NextResponse.json({ error: 'Please read the waiver, check the box, and type your full name to sign it.' }, { status: 400 })
      }
      luxDetails.waiver = { text: config.waiver.text, signedName, signedAt: new Date().toISOString(), ip: clientIp(request) }
    }
    const hasRapha = resolveModuleAccess(event.organization.modulesEnabled, event.organization.subscriptionTier).rapha
    if (config.medical.enabled && hasRapha) {
      luxDetails.medical = {
        allergies: clean(body.medical?.allergies, 2000),
        conditions: clean(body.medical?.conditions, 2000),
        medications: clean(body.medical?.medications, 2000),
        emergencyContactName: clean(body.medical?.emergencyContactName, 255),
        emergencyContactPhone: clean(body.medical?.emergencyContactPhone, 20),
      }
    }

    // --- Tickets and total -------------------------------------------------
    const priced = calculateSimpleEventTotal(
      event.ticketOptions.map(o => ({ id: o.id, name: o.name, price: Number(o.price), remaining: o.remaining, isActive: o.isActive })),
      Array.isArray(body.tickets) ? body.tickets : [],
      config.maxPerRegistration
    )
    if (!priced.ok) return NextResponse.json({ error: priced.error }, { status: 400 })
    const { lines, quantity, total } = priced

    // --- How they're paying ------------------------------------------------
    let method: 'free' | 'office' | 'card'
    if (total <= 0) method = 'free'
    else if (body.paymentMethod === 'office' && config.officePayment.enabled) method = 'office'
    else if (body.paymentMethod === 'card' && config.onlinePayment) method = 'card'
    else if (config.onlinePayment) method = 'card'
    else method = 'office'

    if (method === 'card') {
      if (!event.organization.stripeAccountId || !event.organization.stripeChargesEnabled) {
        if (config.officePayment.enabled) {
          return NextResponse.json({ error: 'Online payment isn’t available right now. Please choose “Pay at the parish office.”' }, { status: 400 })
        }
        return NextResponse.json({ error: 'This parish hasn’t finished setting up online payments. Please contact the parish office.' }, { status: 400 })
      }
      if (Math.round(total * 100) < STRIPE_MINIMUM_CHARGE_CENTS) {
        return NextResponse.json({ error: 'Card payments must be at least $0.50.' }, { status: 400 })
      }
    }

    // --- Take the spots, atomically ---------------------------------------
    if (event.capacityTotal !== null) {
      const taken = await prisma.$executeRaw`
        UPDATE events SET capacity_remaining = capacity_remaining - ${quantity}
        WHERE id = ${event.id}::uuid AND capacity_remaining >= ${quantity}
      `
      if (taken === 0) {
        return NextResponse.json({ error: 'Sorry, there aren’t enough spots left for that many tickets.' }, { status: 409 })
      }
      rollback.push(() => prisma.$executeRaw`
        UPDATE events SET capacity_remaining = LEAST(capacity_total, capacity_remaining + ${quantity})
        WHERE id = ${event.id}::uuid AND capacity_remaining IS NOT NULL
      `)
    }
    for (const line of lines) {
      const option = event.ticketOptions.find(o => o.id === line.optionId)
      if (!option || option.remaining === null) continue
      const taken = await prisma.$executeRaw`
        UPDATE event_ticket_options SET remaining = remaining - ${line.quantity}
        WHERE id = ${line.optionId}::uuid AND remaining >= ${line.quantity}
      `
      if (taken === 0) {
        await runRollback()
        return NextResponse.json({ error: `Sorry, ${line.name} tickets just sold out.` }, { status: 409 })
      }
      rollback.push(() => releaseTicketOptionCapacity([{ optionId: line.optionId, quantity: line.quantity }]))
    }

    // --- Save the registration ---------------------------------------------
    const confirmationCode = generateIndividualConfirmationCode(event.startDate.getUTCFullYear().toString())
    const registration = await prisma.individualRegistration.create({
      data: {
        eventId: event.id,
        organizationId: event.organizationId,
        firstName,
        lastName,
        email,
        phone: config.phoneField === 'hidden' ? '' : phone,
        street: street || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        ticketType: 'general_admission',
        // Simple events don't collect emergency contacts (the columns are required)
        emergencyContact1Name: '',
        emergencyContact1Phone: '',
        registrationStatus: method === 'free' ? 'complete' : method === 'office' ? 'pending_payment' : 'incomplete',
        confirmationCode,
        ticketQuantity: quantity,
        ticketSelections: lines as any,
        luxDetails: Object.keys(luxDetails).length ? (luxDetails as any) : undefined,
      },
    })
    rollback.push(() => deleteRegistrationPermanently('individual', registration.id))

    await prisma.organization.update({
      where: { id: event.organizationId },
      data: { registrationsUsed: { increment: 1 } },
    })
    rollback.push(() => prisma.organization.update({
      where: { id: event.organizationId },
      data: { registrationsUsed: { decrement: 1 } },
    }))

    // Check-in QR, same format as every individual registration
    const qrCode = await generateIndividualRegistrationQr(registration)
    await prisma.individualRegistration.update({ where: { id: registration.id }, data: { qrCode } })

    const answerRows = [...answers.entries()].filter(([questionId, text]) => validQuestionIds.has(questionId) && text)
    if (answerRows.length) {
      await prisma.customRegistrationAnswer.createMany({
        data: answerRows.map(([questionId, answerText]) => ({
          questionId,
          registrationId: registration.id,
          registrationType: 'individual' as const,
          answerText,
        })),
      })
    }

    await prisma.paymentBalance.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        registrationId: registration.id,
        registrationType: 'individual',
        totalAmountDue: total,
        amountPaid: 0,
        amountRemaining: total,
        paymentStatus: method === 'free' ? 'paid_full' : method === 'office' ? 'pending_check_payment' : 'unpaid',
      },
    })

    const eventForEmail = {
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      locationName: event.locationName,
      locationAddress: (event.locationAddress as { address?: string } | null)?.address ?? null,
      slug: event.slug,
    }

    // --- Card: off to Stripe -----------------------------------------------
    if (method === 'card') {
      const { session, platformFeeCents } = await createConnectCheckoutSession({
        organization: event.organization,
        lineItems: lines.map(l => ({
          name: `${event.name}: ${l.name}`,
          amountCents: Math.round(l.unitPrice * 100),
          quantity: l.quantity,
        })),
        metadata: {
          registrationId: registration.id,
          eventId: event.id,
          registrationType: 'individual',
          participantName: `${firstName} ${lastName}`,
          lux: 'simple_event',
        },
        successUrl: appUrl(`/lux/registered/${registration.id}?session_id={CHECKOUT_SESSION_ID}`),
        cancelUrl: appUrl(`/events/${event.slug}?cancelled=1&r=${registration.id}`),
        customerEmail: email,
      })
      rollback.push(() => expireCheckoutSession(session.id))

      await prisma.payment.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          registrationId: registration.id,
          registrationType: 'individual',
          amount: total,
          paymentType: 'balance',
          paymentMethod: 'card',
          paymentStatus: 'pending',
          // Checkout creates the payment intent only once paid; the webhook
          // swaps this session id for the real pi_ id
          stripePaymentIntentId: session.id,
          platformFeeAmount: platformFeeCents / 100,
          processedVia: 'online',
        },
      })

      return NextResponse.json({ success: true, registrationId: registration.id, checkoutUrl: session.url })
    }

    // --- Free / office: confirmed now --------------------------------------
    const confirmation = simpleEventConfirmationEmail({
      organizationName: event.organization.name,
      firstName,
      confirmationCode,
      event: eventForEmail,
      lines,
      total,
      payment: method === 'free' ? 'free' : 'office',
      officeInstructions: config.officePayment.instructions,
      confirmationMessage: config.confirmationMessage,
      lang,
    })
    await sendLuxEmail({
      organizationId: event.organizationId,
      organizationName: event.organization.name,
      to: email,
      recipientName: `${firstName} ${lastName}`,
      replyTo: resolveReplyTo(event.settings, event.organization),
      eventId: event.id,
      registrationId: registration.id,
      registrationType: 'individual',
      emailType: method === 'free' ? 'lux_event_confirmation_free' : 'lux_event_confirmation_office',
      metadata: { total, quantity, confirmationCode },
      ...confirmation,
    })

    return NextResponse.json({ success: true, registrationId: registration.id, checkoutUrl: null })
  } catch (error) {
    console.error('[Lux register] Registration failed:', error)
    await runRollback()
    return NextResponse.json({ error: 'Something went wrong saving your registration. Please try again.' }, { status: 500 })
  }
}
