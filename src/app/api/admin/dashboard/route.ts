import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

// Decode JWT payload to extract user ID when cookies aren't available
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Try to get userId from Authorization header (JWT token) as fallback
    let overrideUserId: string | undefined
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = decodeJwtPayload(token)
      if (payload?.sub) {
        overrideUserId = payload.sub
      }
    }

    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    // Parse year filter — null means "all time"
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const year = yearParam && yearParam !== 'all' ? parseInt(yearParam) : null

    // Build date range filter for the selected year
    const yearFilter = year
      ? {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        }
      : undefined

    // Get all event IDs for the org (scoped to year if provided)
    const eventsInScope = await prisma.event.findMany({
      where: {
        organizationId,
        ...(yearFilter ? { startDate: yearFilter } : {}),
      },
      select: { id: true },
    })
    const eventIds = eventsInScope.map((e: { id: string }) => e.id)

    // Get active events count
    const now = new Date()
    const activeEventsCount = await prisma.event.count({
      where: {
        organizationId,
        status: {
          in: ['registration_open', 'in_progress', 'published'],
        },
        endDate: {
          gte: now,
        },
        ...(yearFilter ? { startDate: yearFilter } : {}),
      },
    })

    // Get total registrations scoped to events in the selected year
    const registrationEventFilter = eventIds.length > 0 ? { in: eventIds } : undefined

    const groupRegistrationsCount = await prisma.groupRegistration.count({
      where: {
        organizationId,
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
    })

    const individualRegistrationsCount = await prisma.individualRegistration.count({
      where: {
        organizationId,
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
    })

    const totalRegistrations = groupRegistrationsCount + individualRegistrationsCount

    // Calculate revenue scoped to events in the selected year
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        paymentStatus: 'succeeded',
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
      select: {
        amount: true,
      },
    })

    const revenue = payments.reduce(
      (sum: number, payment: { amount: unknown }) => sum + Number(payment.amount),
      0
    )

    // Get forms completion stats scoped to events in the selected year
    const totalParticipants = await prisma.participant.count({
      where: {
        organizationId,
        ...(registrationEventFilter
          ? {
              groupRegistration: {
                eventId: registrationEventFilter,
              },
            }
          : {}),
      },
    })

    const completedForms = await prisma.participant.count({
      where: {
        organizationId,
        liabilityFormCompleted: true,
        ...(registrationEventFilter
          ? {
              groupRegistration: {
                eventId: registrationEventFilter,
              },
            }
          : {}),
      },
    })

    const totalIndividualForms = await prisma.individualRegistration.count({
      where: {
        organizationId,
        registrationStatus: 'complete',
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
    })

    const formsCompleted = completedForms + totalIndividualForms
    const formsTotal = totalParticipants + individualRegistrationsCount

    // Get upcoming events (next 3) — always scoped to year if selected
    const upcomingStartDate = yearFilter
      ? { gte: now > yearFilter.gte ? now : yearFilter.gte, lte: yearFilter.lte }
      : { gte: now }
    const upcomingEvents = await prisma.event.findMany({
      where: {
        organizationId,
        status: {
          not: 'draft',
        },
        startDate: upcomingStartDate,
      },
      include: {
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 3,
    })

    // Get recent registrations (last 5) scoped to events in the selected year
    const recentGroupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        organizationId,
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
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
      take: 5,
    })

    // Get pending safe environment certs
    const pendingCerts = await prisma.safeEnvironmentCertificate.count({
      where: {
        organizationId,
        status: 'pending',
      },
    })

    // Get pending check payments
    const pendingCheckPayments = await prisma.payment.count({
      where: {
        organizationId,
        paymentMethod: 'check',
        paymentStatus: 'pending',
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
    })

    // Get registrations with overdue balances
    const overdueBalances = await prisma.paymentBalance.count({
      where: {
        organizationId,
        paymentStatus: {
          in: ['unpaid', 'partial'],
        },
        amountRemaining: {
          gt: 0,
        },
        ...(registrationEventFilter ? { eventId: registrationEventFilter } : {}),
      },
    })

    // Get all years that have events for this org (for the year selector)
    const allEvents = await prisma.event.findMany({
      where: { organizationId },
      select: { startDate: true },
      orderBy: { startDate: 'asc' },
    })
    const availableYears = [
      ...new Set(allEvents.map((e: { startDate: Date }) => e.startDate.getFullYear())),
    ].sort() as number[]
    availableYears.reverse()

    return NextResponse.json({
      stats: {
        activeEvents: activeEventsCount,
        totalRegistrations,
        revenue,
        formsCompleted,
        formsTotal,
      },
      upcomingEvents: upcomingEvents.map((event: {
        id: string
        name: string
        slug: string
        startDate: Date
        endDate: Date
        _count: { groupRegistrations: number; individualRegistrations: number }
      }) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        startDate: event.startDate,
        endDate: event.endDate,
        totalRegistrations: event._count.groupRegistrations + event._count.individualRegistrations,
      })),
      recentRegistrations: recentGroupRegistrations.map((reg: {
        id: string
        groupName: string | null
        totalParticipants: number
        registeredAt: Date
        event: { name: string }
      }) => ({
        id: reg.id,
        groupName: reg.groupName,
        eventName: reg.event.name,
        totalParticipants: reg.totalParticipants,
        registeredAt: reg.registeredAt,
      })),
      pendingActions: {
        pendingCerts,
        pendingCheckPayments,
        overdueBalances,
      },
      availableYears,
      selectedYear: year,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
