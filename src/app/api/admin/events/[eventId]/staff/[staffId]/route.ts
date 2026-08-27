import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  const { eventId, staffId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Staff Detail]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staff = await prisma.staffRegistration.findFirst({
    where: { id: staffId, eventId, organizationId: effectiveOrgId },
    include: {
      vendorRegistration: { select: { businessName: true } },
      liabilityForm: {
        select: { id: true, completed: true, completedAt: true, pdfUrl: true, formStatus: true },
      },
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff registration not found' }, { status: 404 })
  }

  const customAnswers = await prisma.customRegistrationAnswer.findMany({
    where: { registrationId: staff.id, registrationType: 'staff' },
    include: {
      question: {
        select: { id: true, questionText: true, questionType: true, displayOrder: true },
      },
    },
  })

  const payments = await prisma.payment.findMany({
    where: { registrationId: staff.id, registrationType: 'staff' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentStatus: true,
      cardBrand: true,
      cardLast4: true,
      receiptUrl: true,
      processedAt: true,
      createdAt: true,
    },
  })

  const refunds = await prisma.refund.findMany({
    where: { registrationId: staff.id, registrationType: 'staff' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      refundAmount: true,
      refundMethod: true,
      refundReason: true,
      status: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    staff: {
      ...staff,
      customAnswers: customAnswers.map((a) => ({
        questionText: a.question.questionText,
        answerText: a.answerText,
      })),
      payments,
      refunds,
    },
  })
}

const EDITABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'role',
  'tshirtSize',
  'dietaryRestrictions',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  const { eventId, staffId } = await params

  const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix: '[Staff Edit]',
  })
  if (error) return error
  if (!user || !effectiveOrgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staff = await prisma.staffRegistration.findFirst({
    where: { id: staffId, eventId, organizationId: effectiveOrgId },
    select: { id: true },
  })
  if (!staff) {
    return NextResponse.json({ error: 'Staff registration not found' }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const updated = await prisma.staffRegistration.update({
    where: { id: staff.id },
    data: updates,
  })

  return NextResponse.json({ staff: updated })
}
