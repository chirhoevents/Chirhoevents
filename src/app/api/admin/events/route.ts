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

    // Fetch all events for this organization
    const events = await prisma.event.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        settings: true,
        pricing: true,
        groupRegistrations: {
          select: {
            id: true,
            totalParticipants: true,
          },
        },
        individualRegistrations: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    // Calculate stats for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event: any) => {
        // Calculate total registrations count
        const totalRegistrations =
          event._count.groupRegistrations + event._count.individualRegistrations

        // Calculate total participants
        const totalParticipants =
          event.groupRegistrations.reduce(
            (sum: number, reg: any) => sum + reg.totalParticipants,
            0
          ) + event._count.individualRegistrations

        // Calculate revenue
        const payments = await prisma.payment.findMany({
          where: {
            eventId: event.id,
            paymentStatus: 'succeeded',
          },
          select: {
            amount: true,
          },
        })

        const revenue = payments.reduce(
          (sum: number, payment: any) => sum + Number(payment.amount),
          0
        )

        // Calculate total expected revenue (from payment balances)
        const balances = await prisma.paymentBalance.findMany({
          where: {
            eventId: event.id,
          },
          select: {
            totalAmountDue: true,
          },
        })

        const totalExpectedRevenue = balances.reduce(
          (sum: number, balance: any) => sum + Number(balance.totalAmountDue),
          0
        )

        return {
          id: event.id,
          name: event.name,
          slug: event.slug,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          capacityTotal: event.capacityTotal,
          capacityRemaining: event.capacityRemaining,
          registrationOpenDate: event.registrationOpenDate,
          registrationCloseDate: event.registrationCloseDate,
          totalRegistrations,
          totalParticipants,
          revenue,
          totalExpectedRevenue,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        }
      })
    )

    return NextResponse.json({ events: eventsWithStats })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
