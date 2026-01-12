import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    // Get override user ID from JWT token if cookies not available
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 'all' | 'upcoming' | 'past' | 'draft'
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') // 'date' | 'name' | 'registrations'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'

    // Build where clause
    const now = new Date()
    const whereClause: any = {
      organizationId,
    }

    // Apply status filter
    if (status === 'upcoming') {
      whereClause.startDate = { gte: now }
      whereClause.status = { not: 'draft' }
    } else if (status === 'past') {
      whereClause.endDate = { lt: now }
      whereClause.status = { not: 'draft' }
    } else if (status === 'draft') {
      whereClause.status = 'draft'
    }

    // Apply search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build order by clause
    let orderByClause: any = { startDate: 'desc' }
    if (sortBy === 'name') {
      orderByClause = { name: sortOrder }
    } else if (sortBy === 'date') {
      orderByClause = { startDate: sortOrder }
    }
    // Note: registrations sort is handled after fetching since it's a computed field

    // Fetch all events for this organization
    // Use try-catch to handle potential schema migration issues
    let events: any[] = []
    try {
      events = await prisma.event.findMany({
        where: whereClause,
        include: {
          settings: {
            select: {
              id: true,
              eventId: true,
              groupRegistrationEnabled: true,
              individualRegistrationEnabled: true,
              vendorRegistrationEnabled: true,
              waitlistEnabled: true,
              housingEnabled: true,
            },
          },
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
        orderBy: orderByClause,
      })
    } catch (queryError) {
      // If include fails (possibly due to schema migration), try without includes
      console.error('Error with full query, trying basic query:', queryError)
      const basicEvents = await prisma.event.findMany({
        where: whereClause,
        orderBy: orderByClause,
      })
      // Convert to expected format
      events = basicEvents.map((e: any) => ({
        ...e,
        settings: null,
        pricing: null,
        groupRegistrations: [],
        individualRegistrations: [],
        _count: { groupRegistrations: 0, individualRegistrations: 0 }
      }))
    }

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
          locationName: event.locationName,
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

    // Handle registrations sort (computed field, so done post-fetch)
    let sortedEvents = eventsWithStats
    if (sortBy === 'registrations') {
      sortedEvents = eventsWithStats.sort((a: { totalRegistrations: number }, b: { totalRegistrations: number }) => {
        return sortOrder === 'asc'
          ? a.totalRegistrations - b.totalRegistrations
          : b.totalRegistrations - a.totalRegistrations
      })
    }

    return NextResponse.json({ events: sortedEvents })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
