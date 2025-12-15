import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get active events count
    const now = new Date()
    const activeEventsCount = await prisma.event.count({
      where: {
        organizationId: user.organizationId,
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
        organizationId: user.organizationId,
      },
    })

    const individualRegistrationsCount = await prisma.individualRegistration.count({
      where: {
        organizationId: user.organizationId,
      },
    })

    const totalRegistrations = groupRegistrationsCount + individualRegistrationsCount

    // Calculate total revenue
    const payments = await prisma.payment.findMany({
      where: {
        organizationId: user.organizationId,
        paymentStatus: 'succeeded',
      },
      select: {
        amount: true,
      },
    })

    const revenue = payments.reduce(
      (sum: number, payment: { amount: number }) => sum + Number(payment.amount),
      0
    )

    // Get forms completion stats
    const totalParticipants = await prisma.participant.count({
      where: {
        organizationId: user.organizationId,
      },
    })

    const completedForms = await prisma.participant.count({
      where: {
        organizationId: user.organizationId,
        liabilityFormCompleted: true,
      },
    })

    const totalIndividualForms = await prisma.individualRegistration.count({
      where: {
        organizationId: user.organizationId,
        registrationStatus: 'complete',
      },
    })

    const formsCompleted = completedForms + totalIndividualForms
    const formsTotal = totalParticipants + individualRegistrationsCount

    // Get upcoming events (next 3)
    const upcomingEvents = await prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
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
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 3,
    })

    // Get recent registrations (last 5)
    const recentGroupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        organizationId: user.organizationId,
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
        organizationId: user.organizationId,
        status: 'pending',
      },
    })

    // Get pending check payments
    const pendingCheckPayments = await prisma.payment.count({
      where: {
        organizationId: user.organizationId,
        paymentMethod: 'check',
        paymentStatus: 'pending',
      },
    })

    // Get registrations with overdue balances (simplified - would need late fee deadline logic)
    const overdueBalances = await prisma.paymentBalance.count({
      where: {
        organizationId: user.organizationId,
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
      upcomingEvents: upcomingEvents.map((event: any) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        startDate: event.startDate,
        endDate: event.endDate,
        totalRegistrations: event._count.groupRegistrations + event._count.individualRegistrations,
      })),
      recentRegistrations: recentGroupRegistrations.map((reg: any) => ({
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
