import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { findOrgSimpleRegistration, recalculateIndividualBalance } from '@/lib/lux/registrations'
import { paymentRecordedEmail, sendLuxEmail } from '@/lib/lux/email'
import { resolveReplyTo } from '@/lib/email-reply-to'

type Params = { params: Promise<{ id: string }> }

const METHODS: Record<string, 'cash' | 'check' | 'card' | 'other'> = { cash: 'cash', check: 'check', card: 'card', other: 'other' }
const METHOD_LABELS: Record<string, string> = { cash: 'cash', check: 'check', card: 'card at the office', other: 'other' }

/**
 * POST /api/lux/registrations/[id]/payments
 * Record a payment taken at the parish office (cash, check...) for a simple
 * event registration.  { amount, method, checkNumber?, note?, sendEmail? }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request, { manage: true })
  if (error) return error
  const { id } = await params

  const registration = await findOrgSimpleRegistration(ctx.organizationId, id)
  if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  if (registration.cancelledAt) return NextResponse.json({ error: 'This registration was cancelled.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const amount = Math.round(Number(body.amount) * 100) / 100
  const method = METHODS[body.method]
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter the amount received.' }, { status: 400 })
  if (!method) return NextResponse.json({ error: 'Choose how it was paid.' }, { status: 400 })

  const balance = await prisma.paymentBalance.findUnique({ where: { registrationId: id } })
  if (!balance) return NextResponse.json({ error: 'No balance found for this registration.' }, { status: 400 })
  if (amount > Number(balance.amountRemaining) + 0.005) {
    return NextResponse.json({ error: `That's more than the ${Number(balance.amountRemaining).toFixed(2)} still owed.` }, { status: 400 })
  }

  await prisma.payment.create({
    data: {
      organizationId: ctx.organizationId,
      eventId: registration.eventId,
      registrationId: id,
      registrationType: 'individual',
      amount,
      paymentType: 'balance',
      paymentMethod: method,
      paymentStatus: 'succeeded',
      checkNumber: method === 'check' ? (String(body.checkNumber || '').slice(0, 50) || null) : null,
      checkReceivedDate: method === 'check' ? new Date() : null,
      notes: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
      processedAt: new Date(),
      processedByUserId: ctx.user.id,
      processedVia: 'manual',
    },
  })
  const updated = await recalculateIndividualBalance(id)

  if (body.sendEmail !== false && registration.email) {
    const email = paymentRecordedEmail({
      organizationName: registration.event.organization.name,
      firstName: registration.firstName,
      amount,
      method: METHOD_LABELS[method],
      description: registration.event.name,
      remaining: Number(updated?.amountRemaining ?? 0),
      lang: (registration.luxDetails as { lang?: string } | null)?.lang === 'es' ? 'es' : 'en',
    })
    await sendLuxEmail({
      organizationId: ctx.organizationId,
      organizationName: registration.event.organization.name,
      to: registration.email,
      recipientName: `${registration.firstName} ${registration.lastName}`,
      replyTo: resolveReplyTo(registration.event.settings, registration.event.organization),
      eventId: registration.eventId,
      registrationId: id,
      registrationType: 'individual',
      emailType: 'lux_payment_recorded',
      ...email,
    })
  }

  return NextResponse.json({
    success: true,
    balance: updated && {
      amountPaid: Number(updated.amountPaid),
      amountRemaining: Number(updated.amountRemaining),
      paymentStatus: updated.paymentStatus,
    },
  })
}
