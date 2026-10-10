import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit, requireLuxStaff } from '@/lib/lux/access'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/lux/program-registrations/[id]
 *   { staffNotes?, serviceHoursCompleted?, sponsorInfo? }  update
 *   { action: 'cancel', reason? }                          cancel (unpaid fees for that child come off the bill)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const registration = await prisma.luxProgramRegistration.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { order: true, program: { select: { feeType: true } } },
  })
  if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  if (body.action === 'cancel') {
    if (registration.cancelledAt) return NextResponse.json({ error: 'Already cancelled.' }, { status: 400 })
    await prisma.luxProgramRegistration.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        staffNotes: [registration.staffNotes, typeof body.reason === 'string' && body.reason.trim() ? `Cancelled: ${body.reason.trim()}` : null]
          .filter(Boolean).join('\n') || null,
      },
    })
    // A family fee stays with the family while anyone is still registered:
    // move it to another family member in the same registration
    const fee = Number(registration.feeAmount)
    let feeMoved = false
    if (registration.program.feeType === 'per_family' && fee > 0 && registration.orderId) {
      const other = await prisma.luxProgramRegistration.findFirst({
        where: { orderId: registration.orderId, programId: registration.programId, cancelledAt: null, id: { not: id } },
        orderBy: { createdAt: 'asc' },
      })
      if (other) {
        await prisma.$transaction([
          prisma.luxProgramRegistration.update({
            where: { id: other.id },
            data: { feeAmount: registration.feeAmount, discountAmount: registration.discountAmount },
          }),
          prisma.luxProgramRegistration.update({ where: { id }, data: { feeAmount: 0, discountAmount: 0 } }),
        ])
        feeMoved = true
      }
    }

    const order = registration.order
    if (!feeMoved && order && ['office_pending', 'assistance_requested', 'pending_payment'].includes(order.status)) {
      // Take this person's fee off what's still owed
      const newDue = Math.max(Number(order.amountPaid), Math.round((Number(order.amountDue) - fee) * 100) / 100)
      const stillActive = await prisma.luxProgramRegistration.count({ where: { orderId: order.id, cancelledAt: null } })
      await prisma.luxOrder.update({
        where: { id: order.id },
        data: {
          amountDue: newDue,
          total: Math.max(0, Math.round((Number(order.total) - fee) * 100) / 100),
          status: stillActive === 0 && Number(order.amountPaid) === 0 ? 'cancelled'
            : newDue <= Number(order.amountPaid) ? 'paid' : order.status,
        },
      })
    }
    await luxAudit({
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: 'program_registration.cancelled',
      targetType: 'lux_program_registration',
      targetId: id,
      metadata: { reason: body.reason ?? null },
      ip: clientIp(request),
    })
    return NextResponse.json({ success: true })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.staffNotes === 'string') data.staffNotes = body.staffNotes.slice(0, 5000) || null
  if (body.serviceHoursCompleted !== undefined) {
    const hours = body.serviceHoursCompleted === null || body.serviceHoursCompleted === '' ? null : Number(body.serviceHoursCompleted)
    if (hours !== null && (!Number.isInteger(hours) || hours < 0 || hours > 1000)) {
      return NextResponse.json({ error: 'Service hours must be a whole number.' }, { status: 400 })
    }
    data.serviceHoursCompleted = hours
  }
  if (body.sponsorInfo && typeof body.sponsorInfo === 'object') {
    const s = body.sponsorInfo as Record<string, unknown>
    const field = (k: string) => (typeof s[k] === 'string' ? (s[k] as string).slice(0, 255) : '')
    data.sponsorInfo = { name: field('name'), email: field('email'), phone: field('phone'), parish: field('parish'), relationship: field('relationship') }
  }
  await prisma.luxProgramRegistration.update({ where: { id }, data })
  return NextResponse.json({ success: true })
}
