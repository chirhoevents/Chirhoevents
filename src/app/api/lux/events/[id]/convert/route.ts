import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { getTierDisplayName } from '@/lib/subscription-tiers'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/lux/events/[id]/convert
 *
 * Moves a simple event to the full Events portal. Its registrations are
 * already regular individual registrations and its payments regular
 * payments, so they all carry over as they are. Orgs whose plan doesn't
 * include the full Events portal get an upgrade message instead.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  if (!ctx.modules.events) {
    return NextResponse.json({
      error:
        `The full Events portal (group registration, housing, staff and vendors, deposits) isn't part of the ` +
        `${getTierDisplayName(ctx.organization.subscriptionTier)} plan. Contact ChiRho Events support to upgrade, ` +
        `and your event and its registrations will move over as they are.`,
      upgradeRequired: true,
    }, { status: 402 })
  }

  const event = await prisma.event.findFirst({
    where: { id, organizationId: ctx.organizationId, mode: 'simple' },
    select: { id: true, ticketOptions: { where: { isActive: true }, orderBy: { displayOrder: 'asc' }, select: { price: true } } },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const basePrice = Number(event.ticketOptions[0]?.price ?? 0)
  await prisma.event.update({
    where: { id },
    data: {
      mode: 'full',
      pricing: { update: { individualBasePrice: basePrice, individualOffCampusPrice: basePrice } },
    },
  })

  return NextResponse.json({ success: true, redirectTo: `/dashboard/admin/events/${id}/edit` })
}
