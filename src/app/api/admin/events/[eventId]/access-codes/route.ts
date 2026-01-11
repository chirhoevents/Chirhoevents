import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const logPrefix = '[GET /api/admin/events/[eventId]/access-codes]'

  try {
    const { eventId } = await params

    // Verify event access
    const { error, user, event, effectiveOrgId } = await verifyEventAccess(
      request,
      eventId,
      { logPrefix }
    )
    if (error || !user || !event || !effectiveOrgId) {
      return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase()
    const linkedFilter = searchParams.get('linked') // 'all', 'linked', 'unlinked'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build where clause - only for this event
    const whereClause: any = {
      eventId: eventId,
      organizationId: effectiveOrgId,
    }

    if (linkedFilter === 'linked') {
      whereClause.clerkUserId = { not: null }
    } else if (linkedFilter === 'unlinked') {
      whereClause.clerkUserId = null
    }

    if (search) {
      whereClause.OR = [
        { accessCode: { contains: search, mode: 'insensitive' } },
        { groupName: { contains: search, mode: 'insensitive' } },
        { groupLeaderName: { contains: search, mode: 'insensitive' } },
        { groupLeaderEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Count total for pagination
    const total = await prisma.groupRegistration.count({ where: whereClause })

    // Fetch access codes with related data
    const registrations = await prisma.groupRegistration.findMany({
      where: whereClause,
      select: {
        id: true,
        accessCode: true,
        groupName: true,
        parishName: true,
        groupLeaderName: true,
        groupLeaderEmail: true,
        groupLeaderPhone: true,
        clerkUserId: true,
        dashboardLastAccessedAt: true,
        registeredAt: true,
        totalParticipants: true,
      },
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Fetch Clerk user emails for linked accounts
    const clerkUserIds = registrations
      .filter((r) => r.clerkUserId)
      .map((r) => r.clerkUserId as string)

    const clerkUsers: Record<string, { email: string; firstName?: string; lastName?: string }> = {}

    if (clerkUserIds.length > 0) {
      try {
        const client = await clerkClient()
        // Fetch users individually (batch API requires different approach)
        const uniqueIds = [...new Set(clerkUserIds)]
        for (const userId of uniqueIds) {
          try {
            const clerkUser = await client.users.getUser(userId)
            clerkUsers[userId] = {
              email: clerkUser.emailAddresses[0]?.emailAddress || 'Unknown',
              firstName: clerkUser.firstName || undefined,
              lastName: clerkUser.lastName || undefined,
            }
          } catch (err) {
            console.error(`${logPrefix} Failed to fetch Clerk user ${userId}:`, err)
            clerkUsers[userId] = { email: 'Unable to fetch' }
          }
        }
      } catch (err) {
        console.error(`${logPrefix} Error initializing Clerk client:`, err)
      }
    }

    // Build response with linked account info
    const accessCodes = registrations.map((reg) => ({
      id: reg.id,
      accessCode: reg.accessCode,
      groupName: reg.groupName,
      parishName: reg.parishName,
      groupLeaderName: reg.groupLeaderName,
      groupLeaderEmail: reg.groupLeaderEmail,
      groupLeaderPhone: reg.groupLeaderPhone,
      totalParticipants: reg.totalParticipants,
      registeredAt: reg.registeredAt,
      linkedAccount: reg.clerkUserId
        ? {
            clerkUserId: reg.clerkUserId,
            email: clerkUsers[reg.clerkUserId]?.email || 'Unknown',
            firstName: clerkUsers[reg.clerkUserId]?.firstName,
            lastName: clerkUsers[reg.clerkUserId]?.lastName,
            lastAccessed: reg.dashboardLastAccessedAt,
          }
        : null,
    }))

    // Calculate stats for this event
    const allForStats = await prisma.groupRegistration.findMany({
      where: { eventId, organizationId: effectiveOrgId },
      select: { clerkUserId: true },
    })

    const stats = {
      total: allForStats.length,
      linked: allForStats.filter((r) => r.clerkUserId).length,
      unlinked: allForStats.filter((r) => !r.clerkUserId).length,
    }

    return NextResponse.json({
      accessCodes,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error(`${logPrefix} Error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
