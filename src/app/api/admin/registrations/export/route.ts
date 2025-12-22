import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      eventId,
      type,
      paymentStatus,
      formsStatus,
      housingType,
      search,
      registrationIds, // For exporting specific selected registrations
    } = body

    // Build where clauses
    const groupWhereClause: any = {
      organizationId: user.organizationId,
    }

    const individualWhereClause: any = {
      organizationId: user.organizationId,
    }

    // If specific IDs provided, filter by those
    if (registrationIds && registrationIds.length > 0) {
      groupWhereClause.id = { in: registrationIds }
      individualWhereClause.id = { in: registrationIds }
    } else {
      // Event filter
      if (eventId) {
        groupWhereClause.eventId = eventId
        individualWhereClause.eventId = eventId
      }

      // Housing filter
      if (housingType) {
        groupWhereClause.housingType = housingType
        individualWhereClause.housingType = housingType
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        groupWhereClause.OR = [
          { groupName: { contains: searchLower, mode: 'insensitive' } },
          { parishName: { contains: searchLower, mode: 'insensitive' } },
          { groupLeaderName: { contains: searchLower, mode: 'insensitive' } },
          { groupLeaderEmail: { contains: searchLower, mode: 'insensitive' } },
        ]
        individualWhereClause.OR = [
          { firstName: { contains: searchLower, mode: 'insensitive' } },
          { lastName: { contains: searchLower, mode: 'insensitive' } },
          { email: { contains: searchLower, mode: 'insensitive' } },
          { confirmationCode: { contains: searchLower, mode: 'insensitive' } },
        ]
      }
    }

    const shouldFetchGroups = !type || type === 'group'
    const shouldFetchIndividuals = !type || type === 'individual'

    const csvRows: string[] = []

    // CSV Header
    csvRows.push([
      'Type',
      'Event Name',
      'Group/Individual Name',
      'Parish Name',
      'Leader/Contact Name',
      'Email',
      'Phone',
      'Participants',
      'Housing Type',
      'Total Amount',
      'Amount Paid',
      'Balance',
      'Payment Status',
      'Forms Completed',
      'Forms Total',
      'Forms Status',
      'Registration Date',
    ].map(escapeCSV).join(','))

    if (shouldFetchGroups) {
      const groupRegistrations = await prisma.groupRegistration.findMany({
        where: groupWhereClause,
        include: {
          event: {
            select: {
              name: true,
            },
          },
          participants: {
            select: {
              id: true,
              liabilityFormCompleted: true,
            },
          },
        },
        orderBy: {
          registeredAt: 'desc',
        },
      })

      // Get payment balances for group registrations
      const groupRegIds = groupRegistrations.map((r) => r.id)
      const groupPaymentBalances = await prisma.paymentBalance.findMany({
        where: {
          registrationId: { in: groupRegIds },
          registrationType: 'group',
        },
      })

      const paymentBalanceMap = new Map(
        groupPaymentBalances.map((pb) => [pb.registrationId, pb])
      )

      for (const reg of groupRegistrations) {
        const paymentBalance = paymentBalanceMap.get(reg.id)
        const totalAmount = paymentBalance
          ? Number(paymentBalance.totalAmountDue)
          : 0
        const amountPaid = paymentBalance
          ? Number(paymentBalance.amountPaid)
          : 0
        const balance = paymentBalance
          ? Number(paymentBalance.amountRemaining)
          : 0
        const formsCompleted = reg.participants.filter(
          (p) => p.liabilityFormCompleted
        ).length
        const formsTotal = reg.participants.length

        // Determine payment status
        let computedPaymentStatus = 'Balance Due'
        if (balance === 0 && totalAmount > 0) {
          computedPaymentStatus = 'Paid in Full'
        }

        // Determine forms status
        const formsStatusComputed =
          formsCompleted === formsTotal && formsTotal > 0
            ? 'Complete'
            : 'Pending'

        // Apply post-query filters
        if (paymentStatus) {
          if (paymentStatus === 'paid' && balance !== 0) continue
          if (paymentStatus === 'balance' && balance === 0) continue
        }

        if (formsStatus) {
          if (formsStatus === 'complete' && formsCompleted !== formsTotal) continue
          if (formsStatus === 'pending' && formsCompleted === formsTotal && formsTotal > 0) continue
        }

        const housingTypeDisplay = formatHousingType(reg.housingType)

        csvRows.push([
          'Group',
          reg.event.name,
          reg.groupName,
          reg.parishName || '',
          reg.groupLeaderName,
          reg.groupLeaderEmail,
          reg.groupLeaderPhone,
          String(reg.totalParticipants),
          housingTypeDisplay,
          formatCurrency(totalAmount),
          formatCurrency(amountPaid),
          formatCurrency(balance),
          computedPaymentStatus,
          String(formsCompleted),
          String(formsTotal),
          formsStatusComputed,
          formatDate(reg.registeredAt),
        ].map(escapeCSV).join(','))
      }
    }

    if (shouldFetchIndividuals) {
      const individualRegistrations = await prisma.individualRegistration.findMany({
        where: individualWhereClause,
        include: {
          event: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          registeredAt: 'desc',
        },
      })

      // Get payment balances for individual registrations
      const individualRegIds = individualRegistrations.map((r) => r.id)
      const individualPaymentBalances = await prisma.paymentBalance.findMany({
        where: {
          registrationId: { in: individualRegIds },
          registrationType: 'individual',
        },
      })

      const individualPaymentBalanceMap = new Map(
        individualPaymentBalances.map((pb) => [pb.registrationId, pb])
      )

      for (const reg of individualRegistrations) {
        const paymentBalance = individualPaymentBalanceMap.get(reg.id)
        const totalAmount = paymentBalance
          ? Number(paymentBalance.totalAmountDue)
          : 0
        const amountPaid = paymentBalance
          ? Number(paymentBalance.amountPaid)
          : 0
        const balance = paymentBalance
          ? Number(paymentBalance.amountRemaining)
          : 0

        // Determine payment status
        let computedPaymentStatus = 'Balance Due'
        if (balance === 0 && totalAmount > 0) {
          computedPaymentStatus = 'Paid in Full'
        }

        // For individuals, check if registration is complete
        const formComplete = reg.registrationStatus === 'complete'
        const formsStatusComputed = formComplete ? 'Complete' : 'Pending'

        // Apply post-query filters
        if (paymentStatus) {
          if (paymentStatus === 'paid' && balance !== 0) continue
          if (paymentStatus === 'balance' && balance === 0) continue
        }

        if (formsStatus) {
          if (formsStatus === 'complete' && !formComplete) continue
          if (formsStatus === 'pending' && formComplete) continue
        }

        const housingTypeDisplay = formatHousingType(reg.housingType)
        const fullName = `${reg.firstName} ${reg.lastName}`

        csvRows.push([
          'Individual',
          reg.event.name,
          fullName,
          '', // No parish for individuals
          fullName,
          reg.email,
          reg.phone,
          '1',
          housingTypeDisplay,
          formatCurrency(totalAmount),
          formatCurrency(amountPaid),
          formatCurrency(balance),
          computedPaymentStatus,
          formComplete ? '1' : '0',
          '1',
          formsStatusComputed,
          formatDate(reg.registeredAt),
        ].map(escapeCSV).join(','))
      }
    }

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="registrations-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatHousingType(type: string | null): string {
  if (!type) return 'N/A'
  switch (type) {
    case 'on_campus':
      return 'On-Campus'
    case 'off_campus':
      return 'Off-Campus'
    case 'day_pass':
      return 'Day Pass'
    default:
      return type
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
