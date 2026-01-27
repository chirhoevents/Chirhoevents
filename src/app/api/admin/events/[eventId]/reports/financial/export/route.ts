import { NextRequest, NextResponse } from 'next/server'
import { verifyFinancialReportAccess } from '@/lib/api-auth'
import { generateFinancialCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialReportPDF } from '@/lib/reports/pdf-generator'
import { prisma } from '@/lib/prisma'

// Helper to sanitize report data and ensure all values are primitives
function sanitizeReportData(data: any): any {
  if (data === null || data === undefined) {
    return data
  }
  if (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean') {
    return data
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeReportData(item))
  }
  if (typeof data === 'object') {
    if (data.$$typeof) {
      console.error('[Financial Export] Found React element in data')
      return '[React Element]'
    }
    if (data instanceof Date) {
      return data.toISOString()
    }
    if (typeof data === 'bigint') {
      return Number(data)
    }
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeReportData(value)
    }
    return sanitized
  }
  return String(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify financial report access (requires reports.view_financial permission)
    const { error, user, event, effectiveOrgId } = await verifyFinancialReportAccess(
      request,
      eventId,
      '[Financial Export]'
    )
    if (error) return error

    const { format } = await request.json()

    console.log('[Financial Export] Starting export for event:', eventId, 'format:', format)

    // Handle "all" events - filter by organization unless master_admin
    let eventFilter: { eventId?: string; organizationId?: string } = {}
    if (eventId === 'all') {
      if (user!.role !== 'master_admin' && effectiveOrgId) {
        eventFilter = { organizationId: effectiveOrgId }
      }
    } else {
      eventFilter = { eventId }
    }

    // Get payment balances
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: eventFilter,
    })

    const registrationIds = paymentBalances.map((pb: any) => pb.registrationId)

    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { id: { in: registrationIds } },
      include: { participants: true },
    })

    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: { id: { in: registrationIds } },
    })

    const groupRegMap = new Map<string, any>(groupRegistrations.map((gr: any) => [gr.id, gr]))
    const individualRegMap = new Map<string, any>(individualRegistrations.map((ir: any) => [ir.id, ir]))

    const payments = await prisma.payment.findMany({
      where: eventFilter,
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
    const overdueBalance = paymentBalances
      .filter((pb: any) => pb.paymentStatus === 'unpaid')
      .reduce((sum: number, pb: any) => sum + Number(pb.amountRemaining || 0), 0)

    // Payment methods breakdown
    const stripePayments = payments
      .filter((p: any) => p.paymentMethod === 'card')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const checkPayments = payments
      .filter((p: any) => p.paymentMethod === 'check')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Revenue by participant type
    const participantTypeStats: any = {
      youth_u18: { revenue: 0, count: 0, avg: 0 },
      youth_o18: { revenue: 0, count: 0, avg: 0 },
      chaperone: { revenue: 0, count: 0, avg: 0 },
      priest: { revenue: 0, count: 0, avg: 0 },
    }

    for (const pb of paymentBalances) {
      const groupReg = groupRegMap.get(pb.registrationId)
      const individualReg = individualRegMap.get(pb.registrationId)

      if (groupReg && pb.registrationType === 'group') {
        const participants = groupReg.participants
        const totalAmount = Number(pb.totalAmountDue || 0)
        const perPerson = participants.length > 0 ? totalAmount / participants.length : 0

        for (const participant of participants) {
          const type = participant.participantType
          if (type && participantTypeStats[type]) {
            participantTypeStats[type].revenue += perPerson
            participantTypeStats[type].count++
          }
        }
      } else if (individualReg && pb.registrationType === 'individual') {
        const totalAmount = Number(pb.totalAmountDue || 0)
        const age = individualReg.age
        const type = age && age < 18 ? 'youth_u18' : 'youth_o18'
        participantTypeStats[type].revenue += totalAmount
        participantTypeStats[type].count++
      }
    }

    // Calculate averages
    for (const type of Object.keys(participantTypeStats)) {
      const stats = participantTypeStats[type]
      stats.avg = stats.count > 0 ? stats.revenue / stats.count : 0
    }

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

    const reportData = sanitizeReportData({
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
    })

    const eventName = String(event?.name || 'Event')

    if (format === 'csv') {
      const csv = generateFinancialCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="financial_report.csv"',
        },
      })
    } else if (format === 'pdf') {
      // Generate actual PDF using @react-pdf/renderer
      const pdfElement = FinancialReportPDF({ reportData, eventName })
      const pdfBuffer = await renderToBuffer(pdfElement)
      // Convert Buffer to Uint8Array for NextResponse
      const pdfData = new Uint8Array(pdfBuffer)
      return new NextResponse(pdfData, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="financial_report.pdf"',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('[Financial Export] Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
