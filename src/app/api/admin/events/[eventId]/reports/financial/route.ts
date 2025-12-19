import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Auth check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'

    // Handle "all" events
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get payment balances
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: eventFilter,
      include: {
        groupRegistration: {
          include: {
            participants: true,
          },
        },
        individualRegistration: true,
      },
    })

    // Get payments
    const payments = await prisma.payment.findMany({
      where: eventFilter,
    })

    // Get refunds
    const refunds = await prisma.refund.findMany({
      where: {
        ...(eventId === 'all' ? {} : { registrationId: { in: paymentBalances.map(pb => pb.registrationId) } }),
      },
    })

    // Calculate totals
    const totalRevenue = paymentBalances.reduce(
      (sum, pb) => sum + Number(pb.totalAmountDue || 0),
      0
    )
    const amountPaid = paymentBalances.reduce(
      (sum, pb) => sum + Number(pb.amountPaid || 0),
      0
    )
    const balanceDue = paymentBalances.reduce(
      (sum, pb) => sum + Number(pb.amountRemaining || 0),
      0
    )

    // Calculate overdue (simplified - payments where paymentStatus is 'overdue')
    const overdueBalance = paymentBalances
      .filter(pb => pb.paymentStatus === 'overdue')
      .reduce((sum, pb) => sum + Number(pb.amountRemaining || 0), 0)

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
      .filter(p => p.paymentMethod === 'card')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const checkPayments = payments
      .filter(p => p.paymentMethod === 'check')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    // Revenue by participant type
    const participantTypeStats = {
      youthU18: { revenue: 0, count: 0, avg: 0 },
      youthO18: { revenue: 0, count: 0, avg: 0 },
      chaperones: { revenue: 0, count: 0, avg: 0 },
      clergy: { revenue: 0, count: 0, avg: 0 },
    }

    // Count participants from group registrations
    for (const pb of paymentBalances) {
      if (pb.groupRegistration) {
        const participants = pb.groupRegistration.participants
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
      } else if (pb.individualRegistration) {
        // Individual registrations - assume youth based on age
        const totalAmount = Number(pb.totalAmountDue || 0)
        const age = pb.individualRegistration.age
        if (age < 18) {
          participantTypeStats.youthU18.revenue += totalAmount
          participantTypeStats.youthU18.count++
        } else {
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

      if (pb.groupRegistration) {
        housingType = pb.groupRegistration.housingType
        participantCount = pb.groupRegistration.participants.length
      } else if (pb.individualRegistration) {
        housingType = pb.individualRegistration.housingType
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
      .filter(pb => pb.registrationType === 'group')
      .reduce((sum, pb) => sum + Number(pb.totalAmountDue || 0), 0)
    const individualRevenue = paymentBalances
      .filter(pb => pb.registrationType === 'individual')
      .reduce((sum, pb) => sum + Number(pb.totalAmountDue || 0), 0)

    // Payment timeline (group by month)
    const paymentsByMonth: Record<string, number> = {}
    for (const payment of payments) {
      const month = new Date(payment.processedAt).toLocaleDateString('en-US', {
        month: 'short',
      })
      paymentsByMonth[month] = (paymentsByMonth[month] || 0) + Number(payment.amount)
    }

    const paymentTimeline = Object.entries(paymentsByMonth).map(([month, amount]) => ({
      month,
      amount,
    }))

    // Refunds summary
    const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0)
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
