import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get organization counts by status
    const orgCounts = await prisma.organization.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const totalOrgs = orgCounts.reduce((sum: number, o: { status: string; _count: { id: number } }) => sum + o._count.id, 0)
    const activeOrgs = orgCounts.find((o: { status: string }) => o.status === 'active')?._count.id || 0
    const pendingOrgs = orgCounts.find((o: { status: string }) => o.status === 'pending')?._count.id || 0
    const suspendedOrgs = orgCounts.find((o: { status: string }) => o.status === 'suspended')?._count.id || 0

    // Get event counts
    const totalEvents = await prisma.event.count()
    const now = new Date()
    const activeEvents = await prisma.event.count({
      where: {
        endDate: { gte: now },
        status: 'published',
      },
    })

    // Get registration counts
    const groupRegs = await prisma.groupRegistration.count()
    const individualRegs = await prisma.individualRegistration.count()
    const totalRegistrations = groupRegs + individualRegs

    // Get this month's registrations
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthGroupRegs = await prisma.groupRegistration.count({
      where: { createdAt: { gte: startOfMonth } },
    })
    const thisMonthIndividualRegs = await prisma.individualRegistration.count({
      where: { createdAt: { gte: startOfMonth } },
    })
    const thisMonthRegistrations = thisMonthGroupRegs + thisMonthIndividualRegs

    // Get revenue - total payments
    const totalPayments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: 'succeeded' },
    })
    const totalRevenue = Number(totalPayments._sum.amount || 0)

    const thisMonthPayments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentStatus: 'succeeded',
        createdAt: { gte: startOfMonth },
      },
    })
    const thisMonthRevenue = Number(thisMonthPayments._sum.amount || 0)

    // Calculate MRR from active subscriptions
    const activeSubscriptions = await prisma.organization.findMany({
      where: {
        status: 'active',
        subscriptionStatus: 'active',
      },
      select: {
        monthlyFee: true,
        subscriptionTier: true,
      },
    })

    const currentMRR = activeSubscriptions.reduce(
      (sum: number, org: { monthlyFee: number | null }) => sum + Number(org.monthlyFee || 0),
      0
    )
    const annualRunRate = currentMRR * 12

    // Get subscription tier counts
    const tierCounts = await prisma.organization.groupBy({
      by: ['subscriptionTier'],
      _count: { id: true },
      where: { status: 'active' },
    })

    // Get pending actions
    const newOrgRequests = await prisma.organizationOnboardingRequest.count({
      where: { status: 'pending' },
    })

    const openTickets = await prisma.supportTicket.count({
      where: { status: { in: ['open', 'in_progress'] } },
    })

    // Get recent activity (last 10 platform activity logs)
    const recentActivity = await prisma.platformActivityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      platformOverview: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        pendingOrganizations: pendingOrgs,
        suspendedOrganizations: suspendedOrgs,
        totalEvents,
        activeEvents,
        totalRegistrations,
        thisMonthRegistrations,
        totalRevenue,
        thisMonthRevenue,
      },
      mrr: {
        currentMRR,
        annualRunRate,
        growth: 0, // Calculate based on last month
        growthDescription: '',
      },
      pendingActions: {
        newOrgRequests,
        openSupportTickets: openTickets,
        orgsPastDue: 0, // Calculate based on payment due dates
        orgsNearLimits: 0, // Calculate based on usage limits
      },
      subscriptionBreakdown: {
        starter: tierCounts.find((t: { subscriptionTier: string | null }) => t.subscriptionTier === 'starter')?._count.id || 0,
        smallDiocese: tierCounts.find((t: { subscriptionTier: string | null }) => t.subscriptionTier === 'small_diocese')?._count.id || 0,
        growing: tierCounts.find((t: { subscriptionTier: string | null }) => t.subscriptionTier === 'growing')?._count.id || 0,
        conference: tierCounts.find((t: { subscriptionTier: string | null }) => t.subscriptionTier === 'conference')?._count.id || 0,
        enterprise: tierCounts.find((t: { subscriptionTier: string | null }) => t.subscriptionTier === 'enterprise')?._count.id || 0,
        testFree: tierCounts.find((t: { subscriptionTier: string | null }) => t.subscriptionTier === 'test')?._count.id || 0,
        totalActive: activeOrgs,
      },
      recentActivity: recentActivity.map((a: { description: string; createdAt: Date; activityType: string }) => ({
        description: a.description,
        timestamp: a.createdAt.toISOString(),
        type: a.activityType as 'payment' | 'event' | 'ticket' | 'org',
      })),
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
