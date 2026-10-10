import { NextRequest, NextResponse } from 'next/server'
import { prisma, prismaIncludingCancelled } from '@/lib/prisma'
import { requireLuxStaff } from '@/lib/lux/access'
import { ticketLines } from '@/lib/lux/registrations'

type Params = { params: Promise<{ id: string }> }

/** GET /api/lux/events/[id]/registrations?cancelled=1 */
export async function GET(request: NextRequest, { params }: Params) {
  const { error, ctx } = await requireLuxStaff(request)
  if (error) return error
  const { id } = await params
  const includeCancelled = request.nextUrl.searchParams.get('cancelled') === '1'

  const event = await prisma.event.findFirst({
    where: { id, organizationId: ctx.organizationId, mode: 'simple' },
    select: { id: true, customRegistrationQuestions: { orderBy: { displayOrder: 'asc' }, select: { id: true, questionText: true } } },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const registrations = await prismaIncludingCancelled.individualRegistration.findMany({
    where: {
      eventId: id,
      registrationStatus: { not: 'expired' },
      ...(includeCancelled ? {} : { cancelledAt: null }),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, street: true, city: true, state: true, zip: true,
      ticketQuantity: true, ticketSelections: true, luxDetails: true, registrationStatus: true, confirmationCode: true,
      createdAt: true, cancelledAt: true, cancellationReason: true, checkedIn: true,
    },
  })
  const ids = registrations.map(r => r.id)

  const [balances, answers, payments] = await Promise.all([
    prisma.paymentBalance.findMany({
      where: { registrationId: { in: ids } },
      select: { registrationId: true, totalAmountDue: true, amountPaid: true, amountRemaining: true, paymentStatus: true },
    }),
    prisma.customRegistrationAnswer.findMany({
      where: { registrationId: { in: ids } },
      select: { registrationId: true, questionId: true, answerText: true },
    }),
    prisma.payment.findMany({
      where: { registrationId: { in: ids }, registrationType: 'individual', paymentStatus: 'succeeded' },
      orderBy: { createdAt: 'asc' },
      select: { registrationId: true, amount: true, paymentMethod: true, processedAt: true, createdAt: true, receiptUrl: true, checkNumber: true },
    }),
  ])
  const balanceBy = new Map(balances.map(b => [b.registrationId, b]))
  const questionText = new Map(event.customRegistrationQuestions.map(q => [q.id, q.questionText]))

  return NextResponse.json({
    questions: event.customRegistrationQuestions,
    registrations: registrations.map(r => {
      const b = balanceBy.get(r.id)
      return {
        ...r,
        ticketSelections: ticketLines(r.ticketSelections),
        balance: b
          ? {
              totalAmountDue: Number(b.totalAmountDue),
              amountPaid: Number(b.amountPaid),
              amountRemaining: Number(b.amountRemaining),
              paymentStatus: b.paymentStatus,
            }
          : null,
        answers: answers
          .filter(a => a.registrationId === r.id)
          .map(a => ({ questionId: a.questionId, question: questionText.get(a.questionId) ?? '', answer: a.answerText })),
        payments: payments
          .filter(p => p.registrationId === r.id)
          .map(p => ({ ...p, amount: Number(p.amount) })),
      }
    }),
  })
}
