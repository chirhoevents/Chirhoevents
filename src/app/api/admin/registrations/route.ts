import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const type = searchParams.get('type') // 'group' | 'individual' | null (all)
    const paymentStatus = searchParams.get('paymentStatus') // 'paid' | 'balance'
    const formsStatus = searchParams.get('formsStatus') // 'complete' | 'pending'
    const housingType = searchParams.get('housingType') // 'on_campus' | 'off_campus' | 'day_pass'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clauses
    const groupWhereClause: any = {
      organizationId: user.organizationId,
    }

    const individualWhereClause: any = {
      organizationId: user.organizationId,
    }

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

    // Search filter for groups
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

    // Fetch group registrations
    const shouldFetchGroups = !type || type === 'group'
    const shouldFetchIndividuals = !type || type === 'individual'

    let groupRegistrations: any[] = []
    let individualRegistrations: any[] = []
    let totalGroupCount = 0
    let totalIndividualCount = 0

    if (shouldFetchGroups) {
      // Get group registrations with their payment balances
      const rawGroupRegistrations = await prisma.groupRegistration.findMany({
        where: groupWhereClause,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
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
      const groupRegIds = rawGroupRegistrations.map((r) => r.id)
      const groupPaymentBalances = await prisma.paymentBalance.findMany({
        where: {
          registrationId: { in: groupRegIds },
          registrationType: 'group',
        },
      })

      const paymentBalanceMap = new Map(
        groupPaymentBalances.map((pb) => [pb.registrationId, pb] as const)
      )

      // Transform group registrations
      groupRegistrations = rawGroupRegistrations.map((reg) => {
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
        let computedPaymentStatus = 'balance_due'
        if (balance === 0 && totalAmount > 0) {
          computedPaymentStatus = 'paid_full'
        }

        // Determine forms status
        const formsStatusComputed =
          formsCompleted === formsTotal && formsTotal > 0
            ? 'complete'
            : 'pending'

        return {
          id: reg.id,
          type: 'group' as const,
          eventId: reg.eventId,
          eventName: reg.event.name,
          eventSlug: reg.event.slug,
          groupName: reg.groupName,
          parishName: reg.parishName,
          leaderName: reg.groupLeaderName,
          leaderEmail: reg.groupLeaderEmail,
          leaderPhone: reg.groupLeaderPhone,
          participantCount: reg.totalParticipants,
          totalAmount,
          amountPaid,
          balance,
          paymentStatus: computedPaymentStatus,
          formsCompleted,
          formsTotal,
          formsStatus: formsStatusComputed,
          housingType: reg.housingType,
          createdAt: reg.registeredAt.toISOString(),
        }
      })

      // Apply payment status filter
      if (paymentStatus) {
        groupRegistrations = groupRegistrations.filter((reg) => {
          if (paymentStatus === 'paid') return reg.balance === 0
          if (paymentStatus === 'balance') return reg.balance > 0
          return true
        })
      }

      // Apply forms status filter
      if (formsStatus) {
        groupRegistrations = groupRegistrations.filter((reg) => {
          if (formsStatus === 'complete') return reg.formsStatus === 'complete'
          if (formsStatus === 'pending') return reg.formsStatus === 'pending'
          return true
        })
      }

      totalGroupCount = groupRegistrations.length
    }

    if (shouldFetchIndividuals) {
      // Get individual registrations with their payment balances
      const rawIndividualRegistrations =
        await prisma.individualRegistration.findMany({
          where: individualWhereClause,
          include: {
            event: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            registeredAt: 'desc',
          },
        })

      // Get payment balances for individual registrations
      const individualRegIds = rawIndividualRegistrations.map((r) => r.id)
      const individualPaymentBalances = await prisma.paymentBalance.findMany({
        where: {
          registrationId: { in: individualRegIds },
          registrationType: 'individual',
        },
      })

      const individualPaymentBalanceMap = new Map(
        individualPaymentBalances.map((pb) => [pb.registrationId, pb] as const)
      )

      // Transform individual registrations
      individualRegistrations = rawIndividualRegistrations.map((reg) => {
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
        let computedPaymentStatus = 'balance_due'
        if (balance === 0 && totalAmount > 0) {
          computedPaymentStatus = 'paid_full'
        }

        // For individuals, check if registration is complete
        const formComplete = reg.registrationStatus === 'complete'

        return {
          id: reg.id,
          type: 'individual' as const,
          eventId: reg.eventId,
          eventName: reg.event.name,
          eventSlug: reg.event.slug,
          groupName: `${reg.firstName} ${reg.lastName}`,
          parishName: null,
          leaderName: `${reg.firstName} ${reg.lastName}`,
          leaderEmail: reg.email,
          leaderPhone: reg.phone,
          participantCount: 1,
          totalAmount,
          amountPaid,
          balance,
          paymentStatus: computedPaymentStatus,
          formsCompleted: formComplete ? 1 : 0,
          formsTotal: 1,
          formsStatus: formComplete ? 'complete' : 'pending',
          housingType: reg.housingType,
          roomType: reg.roomType,
          confirmationCode: reg.confirmationCode,
          createdAt: reg.registeredAt.toISOString(),
        }
      })

      // Apply payment status filter
      if (paymentStatus) {
        individualRegistrations = individualRegistrations.filter((reg) => {
          if (paymentStatus === 'paid') return reg.balance === 0
          if (paymentStatus === 'balance') return reg.balance > 0
          return true
        })
      }

      // Apply forms status filter
      if (formsStatus) {
        individualRegistrations = individualRegistrations.filter((reg) => {
          if (formsStatus === 'complete') return reg.formsStatus === 'complete'
          if (formsStatus === 'pending') return reg.formsStatus === 'pending'
          return true
        })
      }

      totalIndividualCount = individualRegistrations.length
    }

    // Combine and sort all registrations
    const allRegistrations = [...groupRegistrations, ...individualRegistrations]
    allRegistrations.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Paginate
    const paginatedRegistrations = allRegistrations.slice(skip, skip + limit)
    const totalCount = totalGroupCount + totalIndividualCount

    // Calculate stats (across all filtered registrations, not just current page)
    const totalGroupParticipants = groupRegistrations.reduce(
      (sum, reg) => sum + reg.participantCount,
      0
    )
    const totalRevenue = allRegistrations.reduce(
      (sum, reg) => sum + reg.amountPaid,
      0
    )

    // Get available events for filter dropdown
    const events = await prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
        status: { not: 'draft' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return NextResponse.json({
      registrations: paginatedRegistrations,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalRegistrations: totalCount,
        totalGroups: totalGroupCount,
        totalGroupParticipants,
        totalIndividuals: totalIndividualCount,
        totalRevenue,
      },
      events,
    })
  } catch (error) {
    console.error('Error fetching all registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
