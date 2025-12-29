import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const registrationType = searchParams.get('type') // 'group' or 'individual'

    if (!registrationType || !['group', 'individual'].includes(registrationType)) {
      return NextResponse.json(
        { error: 'Invalid registration type. Must be "group" or "individual".' },
        { status: 400 }
      )
    }

    const registrationId = params.registrationId

    // Verify registration exists and belongs to user's organization
    if (registrationType === 'group') {
      const registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: {
          id: true,
          organizationId: true,
          groupName: true,
        },
      })

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      if (registration.organizationId !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Fetch payment balance
      const paymentBalance = await prisma.paymentBalance.findUnique({
        where: { registrationId },
      })

      // Fetch payments
      const payments = await prisma.payment.findMany({
        where: {
          registrationId,
          registrationType: 'group',
        },
        include: {
          processedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Fetch refunds
      const refunds = await prisma.refund.findMany({
        where: {
          registrationId,
          registrationType: 'group',
        },
        include: {
          processedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        registrationName: registration.groupName,
        paymentBalance: paymentBalance
          ? {
              totalAmountDue: Number(paymentBalance.totalAmountDue),
              amountPaid: Number(paymentBalance.amountPaid),
              amountRemaining: Number(paymentBalance.amountRemaining),
              lateFeesApplied: Number(paymentBalance.lateFeesApplied),
              paymentStatus: paymentBalance.paymentStatus,
            }
          : null,
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          checkNumber: p.checkNumber,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand,
          receiptUrl: p.receiptUrl,
          notes: p.notes,
          processedAt: p.processedAt?.toISOString() || null,
          createdAt: p.createdAt.toISOString(),
          processedBy: p.processedBy,
        })),
        refunds: refunds.map((r: any) => ({
          id: r.id,
          refundAmount: Number(r.refundAmount),
          refundMethod: r.refundMethod,
          refundReason: r.refundReason,
          notes: r.notes,
          status: r.status,
          processedAt: r.createdAt.toISOString(),
          processedBy: r.processedBy,
        })),
      })
    } else {
      // Individual registration
      const registration = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        select: {
          id: true,
          organizationId: true,
          firstName: true,
          lastName: true,
        },
      })

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      if (registration.organizationId !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Fetch payment balance
      const paymentBalance = await prisma.paymentBalance.findUnique({
        where: { registrationId },
      })

      // Fetch payments
      const payments = await prisma.payment.findMany({
        where: {
          registrationId,
          registrationType: 'individual',
        },
        include: {
          processedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Fetch refunds
      const refunds = await prisma.refund.findMany({
        where: {
          registrationId,
          registrationType: 'individual',
        },
        include: {
          processedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        registrationName: `${registration.firstName} ${registration.lastName}`,
        paymentBalance: paymentBalance
          ? {
              totalAmountDue: Number(paymentBalance.totalAmountDue),
              amountPaid: Number(paymentBalance.amountPaid),
              amountRemaining: Number(paymentBalance.amountRemaining),
              lateFeesApplied: Number(paymentBalance.lateFeesApplied),
              paymentStatus: paymentBalance.paymentStatus,
            }
          : null,
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          checkNumber: p.checkNumber,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand,
          receiptUrl: p.receiptUrl,
          notes: p.notes,
          processedAt: p.processedAt?.toISOString() || null,
          createdAt: p.createdAt.toISOString(),
          processedBy: p.processedBy,
        })),
        refunds: refunds.map((r: any) => ({
          id: r.id,
          refundAmount: Number(r.refundAmount),
          refundMethod: r.refundMethod,
          refundReason: r.refundReason,
          notes: r.notes,
          status: r.status,
          processedAt: r.createdAt.toISOString(),
          processedBy: r.processedBy,
        })),
      })
    }
  } catch (error) {
    console.error('Error fetching payment data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
