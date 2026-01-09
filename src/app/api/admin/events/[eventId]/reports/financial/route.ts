import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Auth check
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'

    // Handle "all" events
    const eventFilter = eventId === 'all' ? {} : { eventId }

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

    // Payment methods breakdown
    const stripePayments = payments
      .filter((p: any) => p.paymentMethod === 'card')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const checkPayments = payments
      .filter((p: any) => p.paymentMethod === 'check')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

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

    // Payment timeline (group by month)
    const paymentsByMonth: Record<string, number> = {}
    for (const payment of payments) {
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

    return NextResponse.json({
      totalRevenue,
      amountPaid,
      balanceDue,
      overdueBalance,
      paymentMethods: {
        stripe: stripePayments,
        check: checkPayments,
        pending: balanceDue,
      },
      byParticipantType: participantTypeStats,
      byHousingType: housingTypeStats,
      byRegistrationType: {
        group: groupRevenue,
        individual: individualRevenue,
      },
      paymentTimeline,
      refunds: {
        totalRefunded,
        count: refunds.length,
        reasons: refundReasons,
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
