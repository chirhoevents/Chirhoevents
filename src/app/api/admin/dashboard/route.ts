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
      },
    })

    // Get total registrations across all events
    const groupRegistrationsCount = await prisma.groupRegistration.count({
      where: {
        organizationId,
      },
    })

    const individualRegistrationsCount = await prisma.individualRegistration.count({
      where: {
        organizationId,
      },
    })

    const totalRegistrations = groupRegistrationsCount + individualRegistrationsCount

    // Calculate total revenue
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        paymentStatus: 'succeeded',
      },
      select: {
        amount: true,
      },
    })

    const revenue = payments.reduce(
      (sum: number, payment: { amount: unknown }) => sum + Number(payment.amount),
      0
    )

    // Get forms completion stats
    const totalParticipants = await prisma.participant.count({
      where: {
        organizationId,
      },
    })

    const completedForms = await prisma.participant.count({
      where: {
        organizationId,
        liabilityFormCompleted: true,
      },
    })

    const totalIndividualForms = await prisma.individualRegistration.count({
      where: {
        organizationId,
        registrationStatus: 'complete',
      },
    })

    const formsCompleted = completedForms + totalIndividualForms
    const formsTotal = totalParticipants + individualRegistrationsCount

    // Get upcoming events (next 3) with full capacity data
    const upcomingEvents = await prisma.event.findMany({
      where: {
        organizationId,
        status: {
          not: 'draft',
        },
        startDate: {
          gte: now,
        },
      },
      include: {
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
        settings: true,
        dayPassOptions: true,
        addOns: true,
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 3,
    })

    // Get recent registrations (last 5)
    const recentGroupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        organizationId,
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
      },
    })

    // Get registrations with overdue balances (simplified - would need late fee deadline logic)
    const overdueBalances = await prisma.paymentBalance.count({
      where: {
        organizationId,
        paymentStatus: {
          in: ['unpaid', 'partial'],
        },
        amountRemaining: {
          gt: 0,
        },
      },
    })

    return NextResponse.json({
      stats: {
        activeEvents: activeEventsCount,
        totalRegistrations,
        revenue,
        formsCompleted,
        formsTotal,
      },
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        startDate: event.startDate,
        endDate: event.endDate,
        totalRegistrations: event._count.groupRegistrations + event._count.individualRegistrations,
        capacityStats: {
          // Overall event capacity
          totalCapacity: event.capacityTotal,
          totalRemaining: event.capacityRemaining,
          totalUsed: event.capacityTotal && event.capacityRemaining
            ? event.capacityTotal - event.capacityRemaining
            : null,
          // Housing capacities
          housing: {
            onCampus: event.settings ? {
              capacity: event.settings.onCampusCapacity,
              remaining: event.settings.onCampusRemaining,
              used: event.settings.onCampusCapacity && event.settings.onCampusRemaining !== null
                ? event.settings.onCampusCapacity - event.settings.onCampusRemaining
                : null,
            } : null,
            offCampus: event.settings ? {
              capacity: event.settings.offCampusCapacity,
              remaining: event.settings.offCampusRemaining,
              used: event.settings.offCampusCapacity && event.settings.offCampusRemaining !== null
                ? event.settings.offCampusCapacity - event.settings.offCampusRemaining
                : null,
            } : null,
          },
          // Room capacities (for individual registrations)
          rooms: event.settings ? {
            single: {
              capacity: event.settings.singleRoomCapacity,
              remaining: event.settings.singleRoomRemaining,
              used: event.settings.singleRoomCapacity && event.settings.singleRoomRemaining !== null
                ? event.settings.singleRoomCapacity - event.settings.singleRoomRemaining
                : null,
            },
            double: {
              capacity: event.settings.doubleRoomCapacity,
              remaining: event.settings.doubleRoomRemaining,
              used: event.settings.doubleRoomCapacity && event.settings.doubleRoomRemaining !== null
                ? event.settings.doubleRoomCapacity - event.settings.doubleRoomRemaining
                : null,
            },
            triple: {
              capacity: event.settings.tripleRoomCapacity,
              remaining: event.settings.tripleRoomRemaining,
              used: event.settings.tripleRoomCapacity && event.settings.tripleRoomRemaining !== null
                ? event.settings.tripleRoomCapacity - event.settings.tripleRoomRemaining
                : null,
            },
            quad: {
              capacity: event.settings.quadRoomCapacity,
              remaining: event.settings.quadRoomRemaining,
              used: event.settings.quadRoomCapacity && event.settings.quadRoomRemaining !== null
                ? event.settings.quadRoomCapacity - event.settings.quadRoomRemaining
                : null,
            },
          } : null,
          // Day pass options
          dayPasses: event.dayPassOptions?.map((dp) => ({
            id: dp.id,
            name: dp.name,
            capacity: dp.capacity,
            remaining: dp.remaining,
            used: dp.capacity > 0 ? dp.capacity - dp.remaining : null,
          })) || [],
          // Add-ons
          addOns: event.addOns?.map((addon) => ({
            id: addon.id,
            name: addon.name,
            capacity: addon.maxQuantity,
            remaining: addon.remainingQuantity,
            used: addon.maxQuantity && addon.remainingQuantity !== null
              ? addon.maxQuantity - addon.remainingQuantity
              : null,
          })) || [],
        },
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
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
