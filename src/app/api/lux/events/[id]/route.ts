import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { loadSimpleEventForEditor, soldCounts, updateSimpleEvent, validateSimpleEventInput } from '@/lib/lux/simple-event-server'
import { getSimpleEventStatus } from '@/lib/lux/simple-event'

type Params = { params: Promise<{ id: string }> }

/** GET /api/lux/events/[id]: the event as the editor and detail page need it */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params

  const event = await loadSimpleEventForEditor(ctx.organizationId, id)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const full = await prisma.event.findUnique({
    where: { id },
    select: {
      isPublished: true, status: true, startDate: true, endDate: true, startTime: true, endTime: true,
      timezone: true, registrationOpenDate: true, registrationCloseDate: true, capacityRemaining: true,
    },
  })
  const sold = await soldCounts(id)

  return NextResponse.json({
    event: {
      ...event,
      liveStatus: full ? getSimpleEventStatus(full) : 'draft',
      capacityRemaining: full?.capacityRemaining ?? null,
      sold: { total: sold.total, byOption: Object.fromEntries(sold.byOption) },
    },
  })
}

/** PUT /api/lux/events/[id]: save changes from the editor */
export async function PUT(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const existing = await prisma.event.findFirst({
    where: { id, organizationId: ctx.organizationId, mode: 'simple' },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const parsed = validateSimpleEventInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const result = await updateSimpleEvent({
    organizationId: ctx.organizationId,
    eventId: id,
    input: parsed.value,
    hasRapha: ctx.modules.rapha,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}

/** DELETE /api/lux/events/[id]: delete a draft that nobody has registered for */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: ctx.organizationId, mode: 'simple' },
    select: { id: true, status: true },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Cancelled registrations still have payment history, so they block deletion too
  const registrations = await prismaIncludingCancelled.individualRegistration.count({ where: { eventId: id } })
  if (event.status !== 'draft' || registrations > 0) {
    return NextResponse.json(
      { error: 'Only drafts without registrations can be deleted. Close registration instead.' },
      { status: 400 }
    )
  }

  await prisma.$transaction([
    prisma.customRegistrationQuestion.deleteMany({ where: { eventId: id } }),
    prisma.eventTicketOption.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ])
  return NextResponse.json({ success: true })
}
