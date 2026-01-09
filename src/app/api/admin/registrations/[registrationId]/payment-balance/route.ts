import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const { registrationId } = await params
    const body = await request.json()
    const { registrationType, newTotalDue } = body

    if (!registrationType || !newTotalDue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId,
      },
    })

    if (!paymentBalance) {
      return NextResponse.json(
        { error: 'Payment balance not found' },
        { status: 404 }
      )
    }

    // Verify organization access
    if (!canAccessOrganization(user, paymentBalance.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newTotalDueNumber = Number(newTotalDue)
    const currentAmountPaid = Number(paymentBalance.amountPaid)
    const newAmountRemaining = newTotalDueNumber - currentAmountPaid

    // Determine new payment status
    let newPaymentStatus: 'unpaid' | 'partial' | 'paid_full' | 'overpaid'
    if (newAmountRemaining === 0) {
      newPaymentStatus = 'paid_full'
    } else if (newAmountRemaining < 0) {
      newPaymentStatus = 'overpaid'
    } else if (currentAmountPaid > 0) {
      newPaymentStatus = 'partial'
    } else {
      newPaymentStatus = 'unpaid'
    }

    // Update payment balance
    const updatedBalance = await prisma.paymentBalance.update({
      where: {
        registrationId,
      },
      data: {
        totalAmountDue: newTotalDueNumber,
        amountRemaining: newAmountRemaining,
        paymentStatus: newPaymentStatus,
      },
    })

    // Create audit trail for price change
    const priceDifference = newTotalDueNumber - Number(paymentBalance.totalAmountDue)

    await prisma.registrationEdit.create({
      data: {
        registrationId,
        registrationType: registrationType as 'individual' | 'group',
        editedByUserId: user.id,
        editType: 'payment_updated',
        oldTotal: Number(paymentBalance.totalAmountDue),
        newTotal: newTotalDueNumber,
        difference: priceDifference,
        changesMade: {
          totalAmountDue: {
            old: Number(paymentBalance.totalAmountDue),
            new: newTotalDueNumber,
          },
          amountRemaining: {
            old: Number(paymentBalance.amountRemaining),
            new: newAmountRemaining,
          },
        } as any,
        adminNotes: `Price adjusted from $${paymentBalance.totalAmountDue} to $${newTotalDueNumber} due to housing change. Difference: ${priceDifference > 0 ? '+' : ''}$${priceDifference.toFixed(2)}`,
      },
    })

    return NextResponse.json(updatedBalance)
  } catch (error) {
    console.error('Error updating payment balance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
