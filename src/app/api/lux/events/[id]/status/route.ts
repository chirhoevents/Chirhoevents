import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { simpleEventLimitMessage } from '@/lib/lux/limits'
import { parseSimpleEventConfig } from '@/lib/lux/simple-event'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/lux/events/[id]/status  { action }
 *   publish: open registration (counts toward the plan's simple-event limit)
 *   close:   stop taking registrations
 *   reopen:  take registrations again
 *   hide / show: take the public page down / put it back
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const { action } = await request.json().catch(() => ({}))

  const event = await prisma.event.findFirst({
    where: { id, organizationId: ctx.organizationId, mode: 'simple' },
    select: {
      id: true,
      status: true,
      isPublished: true,
      registrationOpenDate: true,
      luxConfig: true,
      ticketOptions: { where: { isActive: true }, select: { price: true } },
    },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (action === 'publish') {
    if (event.status !== 'draft') {
      return NextResponse.json({ error: 'This event is already published.' }, { status: 400 })
    }
    const limitMessage = await simpleEventLimitMessage(ctx.organizationId, ctx.organization.subscriptionTier)
    if (limitMessage) return NextResponse.json({ error: limitMessage, limitReached: true }, { status: 403 })

    const config = parseSimpleEventConfig(event.luxConfig)
    const hasPaidTickets = event.ticketOptions.some(t => Number(t.price) > 0)
    if (hasPaidTickets && config.onlinePayment && !config.officePayment.enabled) {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { stripeAccountId: true, stripeChargesEnabled: true },
      })
      if (!org?.stripeAccountId || !org.stripeChargesEnabled) {
        return NextResponse.json({
          error: 'Online card payments need Stripe connected first (Settings → Integrations). Or turn on "Pay at the parish office" for this event.',
          needsStripe: true,
        }, { status: 400 })
      }
    }

    await prisma.event.update({
      where: { id },
      data: { status: 'registration_open', isPublished: true, registrationOpenDate: event.registrationOpenDate ?? new Date() },
    })
  } else if (action === 'close') {
    await prisma.event.update({ where: { id }, data: { status: 'registration_closed' } })
  } else if (action === 'reopen') {
    if (event.status === 'draft') return NextResponse.json({ error: 'Publish the event first.' }, { status: 400 })
    await prisma.event.update({ where: { id }, data: { status: 'registration_open', isPublished: true } })
  } else if (action === 'hide' || action === 'show') {
    if (event.status === 'draft') return NextResponse.json({ error: 'Publish the event first.' }, { status: 400 })
    await prisma.event.update({ where: { id }, data: { isPublished: action === 'show' } })
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
