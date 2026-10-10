import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, luxAudit, requireLuxStaff } from '@/lib/lux/access'
import { cancelProgramRegistration, OrderActionError } from '@/lib/lux/order-staff-actions'
import { parseSessions } from '@/lib/lux/program-templates'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/lux/program-registrations/[id]
 *   { staffNotes?, serviceHoursCompleted?, sponsorInfo?, sessionId? }  update (sessionId moves them to another class time)
 *   { action: 'cancel', reason? }                          cancel (unpaid fees for that child come off the bill)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const registration = await prisma.luxProgramRegistration.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, programId: true, sessionId: true, cancelledAt: true, program: { select: { sessions: true } } },
  })
  if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  if (body.action === 'cancel') {
    try {
      await cancelProgramRegistration({ organizationId: ctx.organizationId, registrationId: id, reason: body.reason })
    } catch (e) {
      if (e instanceof OrderActionError) return NextResponse.json({ error: e.message }, { status: e.status })
      throw e
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
  if (typeof body.sessionId === 'string' && body.sessionId !== registration.sessionId) {
    const target = parseSessions(registration.program.sessions).find(sess => sess.id === body.sessionId)
    if (!target) return NextResponse.json({ error: 'That class time isn’t part of this program.' }, { status: 400 })
    if (registration.cancelledAt) return NextResponse.json({ error: 'This registration was cancelled.' }, { status: 400 })
    if (target.capacity) {
      const taken = await prisma.luxProgramRegistration.count({
        where: { programId: registration.programId, sessionId: target.id, cancelledAt: null },
      })
      if (taken >= target.capacity) return NextResponse.json({ error: `${target.name} is full.` }, { status: 400 })
    }
    data.sessionId = target.id
  }
  await prisma.luxProgramRegistration.update({ where: { id }, data })
  return NextResponse.json({ success: true })
}
