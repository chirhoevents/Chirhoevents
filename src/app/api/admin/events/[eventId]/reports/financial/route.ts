import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Auth check - verify user is admin and has access to this event
    const { error, user, event, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Financial Report]',
    })
    if (error) return error

    // Permission check - only users with reports.view_financial can access
    if (!hasPermission(user!.role, 'reports.view_financial')) {
      console.error(`[GET Financial Report] ❌ User ${user!.email} (role: ${user!.role}) lacks reports.view_financial permission`)
      return NextResponse.json(
        { error: 'Forbidden - Financial report access requires finance_manager, org_admin, or master_admin role' },
        { status: 403 }
      )
    }
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'

    // Handle "all" events - filter by organization unless master_admin
    let eventFilter: { eventId?: string; organizationId?: string } = {}
    if (eventId === 'all') {
      // For "all" events, filter by organization (unless master_admin viewing all)
      if (user!.role !== 'master_admin' && effectiveOrgId) {
        eventFilter = { organizationId: effectiveOrgId }
      }
      // master_admin with no effective org sees all
    } else {
      eventFilter = { eventId }
    }

    // Get payment balances
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: eventFilter,
    })

    // Get registrations separately (PaymentBalance has no direct relations)
    const registrationIds = paymentBalances.map((pb: any) => pb.registrationId)

    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        id: { in: registrationIds },
      },
      include: {
        participants: true,
      },
    })

    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: {
        id: { in: registrationIds },
      },
    })

    // Create lookup maps
    const groupRegMap = new Map<string, any>(groupRegistrations.map((gr: any) => [gr.id, gr]))
    const individualRegMap = new Map<string, any>(individualRegistrations.map((ir: any) => [ir.id, ir]))

    // Get payments
    const payments = await prisma.payment.findMany({
      where: eventFilter,
    })

    // Get refunds
    const refunds = await prisma.refund.findMany({
      where: {
        ...(eventId === 'all' ? {} : { registrationId: { in: registrationIds } }),
      },
    })

    // Calculate totals
    const totalRevenue = paymentBalances.reduce(
      (sum: number, pb: any) => sum + Number(pb.totalAmountDue || 0),
      0
    )
    const amountPaid = paymentBalances.reduce(
      (sum: number, pb: any) => sum + Number(pb.amountPaid || 0),
      0
    )
    const balanceDue = paymentBalances.reduce(
      (sum: number, pb: any) => sum + Number(pb.amountRemaining || 0),
      0
    )

    // Calculate overdue (unpaid balances - no explicit overdue status in schema)
    const overdueBalance = paymentBalances
      .filter((pb: any) => pb.paymentStatus === 'unpaid')
      .reduce((sum: number, pb: any) => sum + Number(pb.amountRemaining || 0), 0)

    // If preview, return summary stats only
    if (isPreview) {
      return NextResponse.json({
        totalRevenue,
        amountPaid,
        balanceDue,
        overdueBalance,
      })
    }

    // Only count payments that actually settled. Pending / failed / cancelled
    // Payment rows would otherwise inflate the totals and skew percentages.
    const isSettled = (p: any) =>
      p.paymentStatus === 'succeeded' || p.paymentStatus === 'processing'
    // "Expected" = the row was created (usually as an intent — e.g. group leader
    // chose "pay later by check") but money has not been received. These are NOT
    // counted as paid, but admins want visibility into them.
    const isExpected = (p: any) => p.paymentStatus === 'pending'
    const settledPayments = payments.filter(isSettled)
    const expectedPayments = payments.filter(isExpected)

    // Payment methods breakdown
    const stripePayments = settledPayments
      .filter((p: any) => p.paymentMethod === 'card')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const checkPayments = settledPayments
      .filter((p: any) => p.paymentMethod === 'check')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const cashPayments = settledPayments
      .filter((p: any) => p.paymentMethod === 'cash')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const otherPayments = settledPayments
      .filter(
        (p: any) =>
          p.paymentMethod !== 'card' &&
          p.paymentMethod !== 'check' &&
          p.paymentMethod !== 'cash'
      )
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Expected (not yet received) — split by intended payment method
    const expectedStripe = expectedPayments
      .filter((p: any) => p.paymentMethod === 'card')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const expectedCheck = expectedPayments
      .filter((p: any) => p.paymentMethod === 'check')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const expectedOther = expectedPayments
      .filter(
        (p: any) =>
          p.paymentMethod !== 'card' && p.paymentMethod !== 'check'
      )
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const expectedTotal = expectedStripe + expectedCheck + expectedOther

    // Reconciliation: actualAmountPaid is the sum of settled Payment rows.
    // This can drift from PaymentBalance.amountPaid if balances weren't
    // updated when a Payment was recorded — surface the mismatch so admins
    // can investigate rather than silently trusting the cached value.
    const actualAmountPaid = stripePayments + checkPayments + cashPayments + otherPayments
    const paymentMismatch = Math.abs(actualAmountPaid - amountPaid) > 0.01

    // Revenue by participant type
    const participantTypeStats = {
      youthU18: { revenue: 0, count: 0, avg: 0 },
      youthO18: { revenue: 0, count: 0, avg: 0 },
      chaperones: { revenue: 0, count: 0, avg: 0 },
      clergy: { revenue: 0, count: 0, avg: 0 },
    }

    // Count participants from group registrations
    for (const pb of paymentBalances) {
      const groupReg = groupRegMap.get(pb.registrationId)
      const individualReg = individualRegMap.get(pb.registrationId)

      if (groupReg && pb.registrationType === 'group') {
        const participants = groupReg.participants
        const totalAmount = Number(pb.totalAmountDue || 0)
        const perPerson = participants.length > 0 ? totalAmount / participants.length : 0

        for (const participant of participants) {
          const type = participant.participantType
          if (type === 'youth_u18') {
            participantTypeStats.youthU18.revenue += perPerson
            participantTypeStats.youthU18.count++
          } else if (type === 'youth_o18') {
            participantTypeStats.youthO18.revenue += perPerson
            participantTypeStats.youthO18.count++
          } else if (type === 'chaperone') {
            participantTypeStats.chaperones.revenue += perPerson
            participantTypeStats.chaperones.count++
          } else if (type === 'priest') {
            participantTypeStats.clergy.revenue += perPerson
            participantTypeStats.clergy.count++
          }
        }
      } else if (individualReg && pb.registrationType === 'individual') {
        // Individual registrations - assume youth based on age
        const totalAmount = Number(pb.totalAmountDue || 0)
        const age = individualReg.age
        if (age && age < 18) {
          participantTypeStats.youthU18.revenue += totalAmount
          participantTypeStats.youthU18.count++
        } else if (age) {
          participantTypeStats.youthO18.revenue += totalAmount
          participantTypeStats.youthO18.count++
        }
      }
    }

    // Calculate averages
    participantTypeStats.youthU18.avg =
      participantTypeStats.youthU18.count > 0
        ? participantTypeStats.youthU18.revenue / participantTypeStats.youthU18.count
        : 0
    participantTypeStats.youthO18.avg =
      participantTypeStats.youthO18.count > 0
        ? participantTypeStats.youthO18.revenue / participantTypeStats.youthO18.count
        : 0
    participantTypeStats.chaperones.avg =
      participantTypeStats.chaperones.count > 0
        ? participantTypeStats.chaperones.revenue / participantTypeStats.chaperones.count
        : 0
    participantTypeStats.clergy.avg =
      participantTypeStats.clergy.count > 0
        ? participantTypeStats.clergy.revenue / participantTypeStats.clergy.count
        : 0

    // Revenue by housing type
    const housingTypeStats = {
      onCampus: { revenue: 0, count: 0 },
      offCampus: { revenue: 0, count: 0 },
      dayPass: { revenue: 0, count: 0 },
    }

    for (const pb of paymentBalances) {
      const totalAmount = Number(pb.totalAmountDue || 0)
      let housingType = 'on_campus'
      let participantCount = 1

      const groupReg = groupRegMap.get(pb.registrationId)
      const individualReg = individualRegMap.get(pb.registrationId)

      if (groupReg && pb.registrationType === 'group') {
        housingType = groupReg.housingType
        participantCount = groupReg.participants.length
      } else if (individualReg && pb.registrationType === 'individual') {
        housingType = individualReg.housingType || 'on_campus'
      }

      if (housingType === 'on_campus') {
        housingTypeStats.onCampus.revenue += totalAmount
        housingTypeStats.onCampus.count += participantCount
      } else if (housingType === 'off_campus') {
        housingTypeStats.offCampus.revenue += totalAmount
        housingTypeStats.offCampus.count += participantCount
      } else if (housingType === 'day_pass') {
        housingTypeStats.dayPass.revenue += totalAmount
        housingTypeStats.dayPass.count += participantCount
      }
    }

    // Revenue by registration type
    const groupRevenue = paymentBalances
      .filter((pb: any) => pb.registrationType === 'group')
      .reduce((sum: number, pb: any) => sum + Number(pb.totalAmountDue || 0), 0)
    const individualRevenue = paymentBalances
      .filter((pb: any) => pb.registrationType === 'individual')
      .reduce((sum: number, pb: any) => sum + Number(pb.totalAmountDue || 0), 0)

    // Payment timeline (group by month, settled payments only)
    const paymentsByMonth: Record<string, number> = {}
    for (const payment of settledPayments) {
      if (payment.processedAt) {
        const month = new Date(payment.processedAt).toLocaleDateString('en-US', {
          month: 'short',
        })
        paymentsByMonth[month] = (paymentsByMonth[month] || 0) + Number(payment.amount)
      }
    }

    const paymentTimeline = Object.entries(paymentsByMonth).map(([month, amount]) => ({
      month,
      amount,
    }))

    // Refunds summary
    const totalRefunded = refunds.reduce((sum: number, r: any) => sum + Number(r.refundAmount || 0), 0)
    const refundReasons: Record<string, number> = {}
    for (const refund of refunds) {
      refundReasons[refund.refundReason] = (refundReasons[refund.refundReason] || 0) + 1
    }

    // Helper to derive a human label for a registration
    const labelForRegistration = (pb: any): { payer: string; type: string } => {
      const groupReg = groupRegMap.get(pb.registrationId)
      const indReg = individualRegMap.get(pb.registrationId)
      if (groupReg) {
        return {
          payer: groupReg.groupName || groupReg.parishName || 'Group',
          type: 'Group',
        }
      }
      if (indReg) {
        return {
          payer: `${indReg.firstName || ''} ${indReg.lastName || ''}`.trim() || 'Individual',
          type: 'Individual',
        }
      }
      return { payer: 'Unknown', type: pb.registrationType || '—' }
    }

    // Per-transaction detail for the financial statement.
    // We deliberately exclude Stripe IDs (PaymentIntent / Charge) — they're
    // sensitive and not useful for accounting reports.
    const transactions = settledPayments
      .slice()
      .sort((a: any, b: any) => {
        const da = a.processedAt ? new Date(a.processedAt).getTime() : 0
        const db = b.processedAt ? new Date(b.processedAt).getTime() : 0
        return db - da
      })
      .map((p: any) => {
        const { payer, type: regType } = labelForRegistration({
          registrationId: p.registrationId,
          registrationType: p.registrationType,
        })
        return {
          processedAt: p.processedAt ? new Date(p.processedAt).toISOString() : null,
          amount: Number(p.amount || 0),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          paymentStatus: p.paymentStatus,
          payer,
          registrationType: regType,
          checkNumber: p.checkNumber || null,
          cardLast4: p.cardLast4 || null,
          cardBrand: p.cardBrand || null,
          notes: p.notes || null,
        }
      })

    // Expected (pending) payments — these are commitments / intents only,
    // not money received. A "pay later by check" registration creates one
    // of these. Surfaced so admins can see what's outstanding *by method*
    // without it counting toward revenue.
    const expectedDetails = expectedPayments
      .slice()
      .sort((a: any, b: any) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return db - da
      })
      .map((p: any) => {
        const { payer, type: regType } = labelForRegistration({
          registrationId: p.registrationId,
          registrationType: p.registrationType,
        })
        return {
          createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          amount: Number(p.amount || 0),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          payer,
          registrationType: regType,
          checkNumber: p.checkNumber || null,
        }
      })

    // Per-registration balance breakdown — gives accounting a row per invoice
    const balancesByRegistration = paymentBalances
      .map((pb: any) => {
        const { payer, type: regType } = labelForRegistration(pb)
        return {
          payer,
          registrationType: regType,
          totalAmountDue: Number(pb.totalAmountDue || 0),
          amountPaid: Number(pb.amountPaid || 0),
          amountRemaining: Number(pb.amountRemaining || 0),
          paymentStatus: pb.paymentStatus,
          lastPaymentDate: pb.lastPaymentDate
            ? new Date(pb.lastPaymentDate).toISOString()
            : null,
        }
      })
      .sort((a: any, b: any) => b.totalAmountDue - a.totalAmountDue)

    // Refund detail rows
    const refundDetails = refunds
      .map((r: any) => {
        const { payer, type: regType } = labelForRegistration({
          registrationId: r.registrationId,
          registrationType: r.registrationType,
        })
        return {
          payer,
          registrationType: regType,
          refundAmount: Number(r.refundAmount || 0),
          refundReason: r.refundReason || '',
          refundMethod: r.refundMethod || null,
          refundStatus: r.refundStatus || null,
          processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : null,
        }
      })
      .sort((a: any, b: any) => b.refundAmount - a.refundAmount)

    return NextResponse.json({
      totalRevenue,
      amountPaid,
      actualAmountPaid,
      paymentMismatch,
      balanceDue,
      overdueBalance,
      paymentMethods: {
        stripe: stripePayments,
        check: checkPayments,
        cash: cashPayments,
        other: otherPayments,
        // Kept for backward compatibility with existing consumers.
        // This is the outstanding balance, NOT a payment method, and the UI
        // should display it separately.
        pending: balanceDue,
      },
      expectedPayments: {
        total: expectedTotal,
        stripe: expectedStripe,
        check: expectedCheck,
        other: expectedOther,
        count: expectedPayments.length,
        details: expectedDetails,
      },
      byParticipantType: participantTypeStats,
      byHousingType: housingTypeStats,
      byRegistrationType: {
        group: groupRevenue,
        individual: individualRevenue,
      },
      paymentTimeline,
      transactions,
      balancesByRegistration,
      refunds: {
        totalRefunded,
        count: refunds.length,
        reasons: refundReasons,
        details: refundDetails,
      },
    })
  } catch (error) {
    console.error('Error generating financial report:', error)
    return NextResponse.json(
      { error: 'Failed to generate financial report' },
      { status: 500 }
    )
  }
}
