/**
 * Shared data collection for the Weekly Digest.
 * Used by both the scheduled cron and the "Send Test Digest Now" endpoint
 * so the test email matches what would actually be sent on the schedule.
 */

import { prisma } from './prisma'
import { WeeklyDigestData } from './weekly-digest'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

export interface DigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek?: number
}

interface PaymentAmount {
  amount: number | bigint | { toNumber?: () => number }
}

interface EventWithCounts {
  name: string
  startDate: Date
  capacityTotal: number | null
  capacityRemaining: number | null
  _count: {
    groupRegistrations: number
    individualRegistrations: number
  }
}

export function getDigestSettings(customFields: Record<string, any> | null): DigestSettings {
  if (!customFields || !customFields.weeklyDigest) {
    return { enabled: false, recipients: [] }
  }

  const settings = customFields.weeklyDigest
  return {
    enabled: settings.enabled === true,
    recipients: Array.isArray(settings.recipients) ? settings.recipients : [],
    dayOfWeek: typeof settings.dayOfWeek === 'number' ? settings.dayOfWeek : 0,
  }
}

export function getWeeklyDateRange(now: Date = new Date()): {
  weekStart: Date
  now: Date
  display: { start: string; end: string }
} {
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  return {
    weekStart,
    now,
    display: {
      start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
  }
}

export async function collectOrganizationStats(
  organizationId: string,
  weekStart: Date,
  now: Date
): Promise<WeeklyDigestData['stats']> {
  const [
    newGroupRegsThisWeek,
    totalGroupRegs,
    newIndividualRegsThisWeek,
    totalIndividualRegs,
    newParticipantsThisWeek,
    totalParticipants,
  ] = await Promise.all([
    prisma.groupRegistration.count({
      where: { organizationId, registeredAt: { gte: weekStart, lte: now } },
    }),
    prisma.groupRegistration.count({ where: { organizationId } }),
    prisma.individualRegistration.count({
      where: { organizationId, registeredAt: { gte: weekStart, lte: now } },
    }),
    prisma.individualRegistration.count({ where: { organizationId } }),
    prisma.participant.count({
      where: { organizationId, createdAt: { gte: weekStart, lte: now } },
    }),
    prisma.participant.count({ where: { organizationId } }),
  ])

  const [paymentsThisWeek, allPayments, pendingCheckPayments, overdueBalances, overdueInvoiceRows] = await Promise.all([
    prisma.payment.findMany({
      where: {
        organizationId,
        paymentStatus: 'succeeded',
        createdAt: { gte: weekStart, lte: now },
      },
      select: { amount: true },
    }),
    prisma.payment.findMany({
      where: { organizationId, paymentStatus: 'succeeded' },
      select: { amount: true },
    }),
    prisma.payment.count({
      where: { organizationId, paymentMethod: 'check', paymentStatus: 'pending' },
    }),
    prisma.paymentBalance.count({
      where: {
        organizationId,
        paymentStatus: { in: ['unpaid', 'partial'] },
        amountRemaining: { gt: 0 },
      },
    }),
    // Platform invoices the org owes to ChiRho that are past their due date.
    // Matches the same query the OverdueInvoicesModal uses.
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['pending', 'overdue'] },
        dueDate: { lt: now },
      },
      select: { amount: true },
    }),
  ])

  const revenueThisWeek = paymentsThisWeek.reduce((sum: number, p: PaymentAmount) => sum + Number(p.amount), 0)
  const totalRevenue = allPayments.reduce((sum: number, p: PaymentAmount) => sum + Number(p.amount), 0)
  const overdueInvoices = overdueInvoiceRows.length
  const overdueInvoiceAmount = overdueInvoiceRows.reduce((sum: number, i: PaymentAmount) => sum + Number(i.amount), 0)

  const [formsCompletedThisWeek, formsTotal, formsPending, pendingCerts] = await Promise.all([
    prisma.participant.count({
      where: {
        organizationId,
        liabilityFormCompleted: true,
        updatedAt: { gte: weekStart, lte: now },
      },
    }),
    prisma.participant.count({ where: { organizationId } }),
    prisma.participant.count({
      where: { organizationId, liabilityFormCompleted: false },
    }),
    prisma.safeEnvironmentCertificate.count({
      where: { organizationId, status: 'pending' },
    }),
  ])

  const [openTickets, ticketsResolvedThisWeek, newTicketsThisWeek] = await Promise.all([
    prisma.supportTicket.count({
      where: { organizationId, status: { in: ['open', 'in_progress'] } },
    }),
    prisma.supportTicket.count({
      where: {
        organizationId,
        status: 'resolved',
        resolvedAt: { gte: weekStart, lte: now },
      },
    }),
    prisma.supportTicket.count({
      where: { organizationId, createdAt: { gte: weekStart, lte: now } },
    }),
  ])

  const [activeEvents, upcomingEventsCount] = await Promise.all([
    prisma.event.count({
      where: {
        organizationId,
        status: { in: ['registration_open', 'in_progress', 'published'] },
        endDate: { gte: now },
      },
    }),
    prisma.event.count({
      where: {
        organizationId,
        status: { not: 'draft' },
        startDate: { gte: now },
      },
    }),
  ])

  return {
    newRegistrationsThisWeek: newGroupRegsThisWeek + newIndividualRegsThisWeek,
    totalRegistrations: totalGroupRegs + totalIndividualRegs,
    newParticipantsThisWeek,
    totalParticipants,
    revenueThisWeek,
    totalRevenue,
    pendingPayments: pendingCheckPayments,
    overdueBalances,
    overdueInvoices,
    overdueInvoiceAmount,
    formsCompletedThisWeek,
    formsTotal,
    formsPending,
    pendingCertificates: pendingCerts,
    openTickets,
    ticketsResolvedThisWeek,
    newTicketsThisWeek,
    activeEvents,
    upcomingEventsCount,
  }
}

export function generateActionItems(
  stats: WeeklyDigestData['stats']
): WeeklyDigestData['actionItems'] {
  const items: WeeklyDigestData['actionItems'] = []

  if (stats.pendingCertificates > 0) {
    items.push({
      type: 'warning',
      title: 'Pending Safe Environment Certificates',
      description: 'Certificates awaiting verification',
      count: stats.pendingCertificates,
      actionUrl: `${APP_URL}/dashboard/admin/settings/certificates`,
    })
  }

  if (stats.pendingPayments > 0) {
    items.push({
      type: 'info',
      title: 'Pending Check Payments',
      description: 'Checks awaiting receipt confirmation',
      count: stats.pendingPayments,
      actionUrl: `${APP_URL}/dashboard/admin/registrations?filter=pending_check`,
    })
  }

  if (stats.overdueInvoices > 0) {
    items.push({
      type: 'urgent',
      title: 'Past-Due ChiRho Invoices',
      description: `Your organization owes ChiRho ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.overdueInvoiceAmount)} on past-due platform invoices`,
      count: stats.overdueInvoices,
      actionUrl: `${APP_URL}/dashboard/admin`,
    })
  }

  if (stats.overdueBalances > 0) {
    items.push({
      type: 'warning',
      title: 'Group Registration Balances Outstanding',
      description: 'Group registrations that still owe a balance for an event',
      count: stats.overdueBalances,
      actionUrl: `${APP_URL}/dashboard/admin/registrations?filter=overdue`,
    })
  }

  if (stats.openTickets && stats.openTickets > 0) {
    items.push({
      type: stats.openTickets > 5 ? 'warning' : 'info',
      title: 'Open Support Tickets',
      description: 'Tickets awaiting response',
      count: stats.openTickets,
      actionUrl: `${APP_URL}/dashboard/admin/support`,
    })
  }

  if (stats.formsPending > 0) {
    items.push({
      type: 'info',
      title: 'Incomplete Liability Forms',
      description: 'Participants who haven\'t completed forms',
      count: stats.formsPending,
      actionUrl: `${APP_URL}/dashboard/admin/reports`,
    })
  }

  return items
}

export async function getUpcomingEvents(
  organizationId: string
): Promise<WeeklyDigestData['upcomingEvents']> {
  const now = new Date()
  const events = await prisma.event.findMany({
    where: {
      organizationId,
      status: { not: 'draft' },
      startDate: { gte: now },
    },
    select: {
      name: true,
      startDate: true,
      capacityTotal: true,
      capacityRemaining: true,
      _count: {
        select: {
          groupRegistrations: true,
          individualRegistrations: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
    take: 5,
  })

  return events.map((event: EventWithCounts) => ({
    name: event.name,
    startDate: event.startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    registrationCount: event._count.groupRegistrations + event._count.individualRegistrations,
    spotsRemaining: event.capacityRemaining ?? undefined,
  }))
}

export async function getRecentActivity(
  organizationId: string,
  weekStart: Date
): Promise<WeeklyDigestData['recentActivity']> {
  const recentPayments = await prisma.payment.findMany({
    where: {
      organizationId,
      paymentStatus: 'succeeded',
      createdAt: { gte: weekStart },
    },
    select: {
      amount: true,
      registrationType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  const recentRegistrations = await prisma.groupRegistration.findMany({
    where: {
      organizationId,
      registeredAt: { gte: weekStart },
    },
    include: {
      event: { select: { name: true } },
    },
    orderBy: { registeredAt: 'desc' },
    take: 3,
  })

  const activity: WeeklyDigestData['recentActivity'] = []

  for (const payment of recentPayments) {
    const regType = payment.registrationType === 'group' ? 'group' : 'individual'
    activity.push({
      type: 'payment',
      description: `Payment of $${Number(payment.amount).toFixed(2)} received (${regType})`,
      time: formatTimeAgo(payment.createdAt),
    })
  }

  for (const reg of recentRegistrations) {
    activity.push({
      type: 'registration',
      description: `${reg.groupName} registered for ${reg.event.name}`,
      time: formatTimeAgo(reg.registeredAt),
    })
  }

  return activity.slice(0, 5)
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  return 'Just now'
}

/**
 * Build the complete digest payload for a single organization,
 * using a fresh "last 7 days" window.
 */
export async function buildOrganizationDigest(
  organizationId: string,
  organizationName: string,
  recipientName: string
): Promise<WeeklyDigestData> {
  const { weekStart, now, display } = getWeeklyDateRange()

  const [stats, upcomingEvents, recentActivity] = await Promise.all([
    collectOrganizationStats(organizationId, weekStart, now),
    getUpcomingEvents(organizationId),
    getRecentActivity(organizationId, weekStart),
  ])

  const actionItems = generateActionItems(stats)

  return {
    organizationName,
    recipientName,
    dateRange: display,
    stats,
    upcomingEvents,
    actionItems,
    recentActivity,
    dashboardUrl: `${APP_URL}/dashboard/admin`,
  }
}
