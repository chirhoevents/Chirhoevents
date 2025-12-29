import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Debug endpoint to see ALL payments for a registration
// Accepts either registration UUID or access code/confirmation code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    let registrationId = resolvedParams.registrationId
    let registrationType: 'group' | 'individual' | null = null
    let registrationInfo: any = null

    // Check if this is a UUID or an access code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationId)

    if (!isUUID) {
      // Try to find by access code (group) or confirmation code (individual)
      const groupReg = await prisma.groupRegistration.findFirst({
        where: { accessCode: registrationId },
        select: { id: true, groupName: true, accessCode: true },
      })

      if (groupReg) {
        registrationId = groupReg.id
        registrationType = 'group'
        registrationInfo = { type: 'group', name: groupReg.groupName, accessCode: groupReg.accessCode }
      } else {
        const indivReg = await prisma.individualRegistration.findFirst({
          where: { confirmationCode: registrationId },
          select: { id: true, firstName: true, lastName: true, confirmationCode: true },
        })

        if (indivReg) {
          registrationId = indivReg.id
          registrationType = 'individual'
          registrationInfo = { type: 'individual', name: `${indivReg.firstName} ${indivReg.lastName}`, confirmationCode: indivReg.confirmationCode }
        } else {
          return NextResponse.json({
            error: 'Registration not found',
            searchedFor: registrationId,
            hint: 'Provide either a UUID or a valid access code/confirmation code',
          }, { status: 404 })
        }
      }
    } else {
      // UUID provided, try to find the registration
      const groupReg = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: { id: true, groupName: true, accessCode: true },
      })

      if (groupReg) {
        registrationType = 'group'
        registrationInfo = { type: 'group', name: groupReg.groupName, accessCode: groupReg.accessCode }
      } else {
        const indivReg = await prisma.individualRegistration.findUnique({
          where: { id: registrationId },
          select: { id: true, firstName: true, lastName: true, confirmationCode: true },
        })

        if (indivReg) {
          registrationType = 'individual'
          registrationInfo = { type: 'individual', name: `${indivReg.firstName} ${indivReg.lastName}`, confirmationCode: indivReg.confirmationCode }
        }
      }
    }

    // Get ALL payments for this registration, no filters
    const allPayments = await prisma.payment.findMany({
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        registrationId: true,
        registrationType: true,
        amount: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentType: true,
        createdAt: true,
        updatedAt: true,
        processedAt: true,
        notes: true,
      },
    })

    // Get payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: { registrationId },
    })

    // Calculate what the balance SHOULD be
    const succeededPayments = allPayments.filter((p: { paymentStatus: string }) => p.paymentStatus === 'succeeded')
    const calculatedTotal = succeededPayments.reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0)

    return NextResponse.json({
      registrationId,
      registrationInfo,
      hasPaymentBalance: !!paymentBalance,
      totalPaymentsInDB: allPayments.length,
      succeededPaymentsCount: succeededPayments.length,
      calculatedTotalFromSucceeded: calculatedTotal,
      currentBalanceAmountPaid: paymentBalance ? Number(paymentBalance.amountPaid) : null,
      currentBalanceTotalDue: paymentBalance ? Number(paymentBalance.totalAmountDue) : null,
      discrepancy: paymentBalance ? Number(paymentBalance.amountPaid) - calculatedTotal : null,
      allPayments: allPayments.map((p: { amount: unknown }) => ({
        ...p,
        amount: Number(p.amount),
      })),
      paymentBalance: paymentBalance ? {
        id: paymentBalance.id,
        registrationType: paymentBalance.registrationType,
        totalAmountDue: Number(paymentBalance.totalAmountDue),
        amountPaid: Number(paymentBalance.amountPaid),
        amountRemaining: Number(paymentBalance.amountRemaining),
        paymentStatus: paymentBalance.paymentStatus,
      } : null,
      warning: !paymentBalance ? 'NO PAYMENT BALANCE FOUND - payments cannot be recorded without a PaymentBalance record!' : null,
    })
  } catch (error) {
    console.error('Debug payments error:', error)
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 })
  }
}
