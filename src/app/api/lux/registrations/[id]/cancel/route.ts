import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { findOrgSimpleRegistration, releaseSimpleEventCapacity } from '@/lib/lux/registrations'
import { abandonUnpaidCheckout } from '@/lib/abandoned-checkout'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/lux/registrations/[id]/cancel  { reason? }
 * Cancels a simple-event registration and gives its tickets back. Payments
 * stay on record; refunds are a separate step.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const { reason } = await request.json().catch(() => ({}))

  const registration = await findOrgSimpleRegistration(ctx.organizationId, id)
  if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  if (registration.cancelledAt) return NextResponse.json({ error: 'Already cancelled.' }, { status: 400 })

  // Still sitting at Stripe checkout: close the checkout and remove it entirely
  if (registration.registrationStatus === 'incomplete') {
    const result = await abandonUnpaidCheckout('individual', id, { releaseWithoutCheckout: true })
    if (result.status === 'released') return NextResponse.json({ success: true, removed: true })
    if (result.status === 'paid') {
      return NextResponse.json({ error: 'This person just finished paying. Refresh and try again.' }, { status: 409 })
    }
  }

  const claimed = await prismaIncludingCancelled.individualRegistration.updateMany({
    where: { id, cancelledAt: null },
    data: {
      cancelledAt: new Date(),
      cancelledByUserId: ctx.user.id,
      cancellationReason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 1000) : null,
    },
  })
  if (claimed.count === 0) return NextResponse.json({ error: 'Already cancelled.' }, { status: 400 })

  await releaseSimpleEventCapacity(registration)
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { registrationsUsed: { decrement: 1 } },
  })

  return NextResponse.json({ success: true })
}
