import { prisma } from '@/lib/prisma'

export { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/lux/program-status'

/** One faith formation order, as the staff order panel shows it */
export async function loadOrderForStaff(organizationId: string, orderId: string) {
  const order = await prisma.luxOrder.findFirst({
    where: { id: orderId, organizationId },
    include: {
      household: { select: { id: true, guardian1FirstName: true, guardian1LastName: true, email: true, phone: true } },
      registrations: {
        include: {
          child: { select: { firstName: true, lastName: true } },
          program: { select: { id: true, name: true, term: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!order) return null

  const payments = await prisma.payment.findMany({
    where: { registrationId: order.id, registrationType: 'lux_order', paymentStatus: { in: ['succeeded', 'pending'] } },
    include: { processedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const resolver = order.feeAssistanceResolvedById
    ? await prisma.user.findUnique({ where: { id: order.feeAssistanceResolvedById }, select: { firstName: true, lastName: true } })
    : null

  return {
    id: order.id,
    confirmationCode: order.confirmationCode,
    status: order.status,
    paymentMethod: order.paymentMethod,
    subtotal: Number(order.subtotal),
    siblingDiscount: Number(order.siblingDiscount),
    familyCapAdjustment: Number(order.familyCapAdjustment),
    total: Number(order.total),
    amountDue: Number(order.amountDue),
    amountPaid: Number(order.amountPaid),
    owed: Math.max(0, Math.round((Number(order.amountDue) - Number(order.amountPaid)) * 100) / 100),
    feeAssistance: {
      requested: order.feeAssistanceRequested,
      status: order.feeAssistanceStatus,
      note: order.feeAssistanceNote,
      staffNote: order.feeAssistanceStaffNote,
      resolvedAt: order.feeAssistanceResolvedAt,
      resolvedBy: resolver ? `${resolver.firstName} ${resolver.lastName}`.trim() : null,
    },
    createdAt: order.createdAt,
    household: order.household,
    registrations: order.registrations.map(r => ({
      id: r.id,
      childName: `${r.child.firstName} ${r.child.lastName}`,
      programId: r.program.id,
      programName: r.program.name,
      term: r.program.term,
      status: r.status,
      feeAmount: Number(r.feeAmount),
      discountAmount: Number(r.discountAmount),
    })),
    payments: payments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.paymentMethod,
      status: p.paymentStatus,
      checkNumber: p.checkNumber,
      notes: p.notes,
      receiptUrl: p.receiptUrl,
      at: p.processedAt ?? p.createdAt,
      by: p.processedBy ? `${p.processedBy.firstName} ${p.processedBy.lastName}`.trim() : p.processedVia === 'online' ? 'Paid online' : null,
    })),
  }
}

export type StaffOrder = NonNullable<Awaited<ReturnType<typeof loadOrderForStaff>>>
