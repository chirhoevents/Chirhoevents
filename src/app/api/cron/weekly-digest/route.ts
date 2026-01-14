import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateWeeklyDigestEmail, generateWeeklyDigestSubject, WeeklyDigestData } from '@/lib/weekly-digest'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

// Secret key to verify cron requests
const CRON_SECRET = process.env.CRON_SECRET

interface DigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek?: number // 0-6, default Sunday (0)
}

/**
 * GET /api/cron/weekly-digest
 * Triggers weekly digest emails for all organizations with digest enabled.
 * Should be called by a cron job (e.g., Vercel Cron, external scheduler)
 *
 * Headers required:
 * - Authorization: Bearer <CRON_SECRET>
 *
 * Query params:
 * - orgId: (optional) Send digest for a specific organization only
 * - test: (optional) If "true", only fetches data without sending emails
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const specificOrgId = searchParams.get('orgId')
    const isTest = searchParams.get('test') === 'true'

    // Calculate date range (last 7 days)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const dateRange = {
      start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }

    // Get all organizations with digest enabled (or specific org)
    const organizations = await prisma.organization.findMany({
      where: {
        ...(specificOrgId ? { id: specificOrgId } : {}),
        status: 'active',
      },
      include: {
        users: {
          where: {
            role: { in: ['org_admin', 'master_admin', 'event_manager'] },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const results: { orgId: string; orgName: string; status: string; recipients: number; error?: string }[] = []

    for (const org of organizations) {
      try {
        // Check if digest is enabled for this organization
        const digestSettings = getDigestSettings(org.customFieldsEnabled as Record<string, any>)

        if (!digestSettings.enabled && !specificOrgId) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            status: 'skipped',
            recipients: 0,
          })
          continue
        }

        // Get recipients (either from settings or all admins/owners)
        const recipients = digestSettings.recipients.length > 0
          ? digestSettings.recipients
          : org.users.map(u => u.email)

        if (recipients.length === 0) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            status: 'no_recipients',
            recipients: 0,
          })
          continue
        }

        // Collect stats for this organization
        const stats = await collectOrganizationStats(org.id, weekStart, now)

        // Generate action items
        const actionItems = generateActionItems(stats, org.id)

        // Get upcoming events
        const upcomingEvents = await getUpcomingEvents(org.id)

        // Get recent activity
        const recentActivity = await getRecentActivity(org.id, weekStart)

        // Build digest data
        const digestData: WeeklyDigestData = {
          organizationName: org.name,
          recipientName: org.users[0]?.firstName || 'Admin',
          dateRange,
          stats,
          upcomingEvents,
          actionItems,
          recentActivity,
          dashboardUrl: `${APP_URL}/dashboard/admin`,
        }

        if (isTest) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            status: 'test_success',
            recipients: recipients.length,
          })
          continue
        }

        // Generate email content
        const subject = generateWeeklyDigestSubject(org.name, dateRange)
        const htmlContent = generateWeeklyDigestEmail(digestData)

        // Send email to all recipients
        for (const recipientEmail of recipients) {
          const recipientUser = org.users.find(u => u.email === recipientEmail)
          const personalizedDigest = {
            ...digestData,
            recipientName: recipientUser
              ? `${recipientUser.firstName}`
              : 'Admin',
          }

          const personalizedHtml = generateWeeklyDigestEmail(personalizedDigest)

          try {
            await resend.emails.send({
              from: 'ChiRho Events <noreply@chirhoevents.com>',
              to: recipientEmail,
              subject,
              html: personalizedHtml,
            })

            await logEmail({
              organizationId: org.id,
              recipientEmail,
              recipientName: recipientUser?.firstName,
              emailType: 'weekly_digest',
              subject,
              htmlContent: personalizedHtml,
            })
          } catch (emailError) {
            console.error(`Failed to send digest to ${recipientEmail}:`, emailError)
            await logEmailFailure(
              {
                organizationId: org.id,
                recipientEmail,
                recipientName: recipientUser?.firstName,
                emailType: 'weekly_digest',
                subject,
                htmlContent: personalizedHtml,
              },
              emailError instanceof Error ? emailError.message : 'Unknown error'
            )
          }
        }

        results.push({
          orgId: org.id,
          orgName: org.name,
          status: 'sent',
          recipients: recipients.length,
        })
      } catch (orgError) {
        console.error(`Error processing org ${org.id}:`, orgError)
        results.push({
          orgId: org.id,
          orgName: org.name,
          status: 'error',
          recipients: 0,
          error: orgError instanceof Error ? orgError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      dateRange,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    })
  } catch (error) {
    console.error('Weekly digest cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Parse digest settings from org customFieldsEnabled
 */
function getDigestSettings(customFields: Record<string, any> | null): DigestSettings {
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

/**
 * Collect all stats for an organization
 */
async function collectOrganizationStats(
  organizationId: string,
  weekStart: Date,
  now: Date
): Promise<WeeklyDigestData['stats']> {
  // Registration counts
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

  // Financial stats
  const [paymentsThisWeek, allPayments, pendingCheckPayments, overdueBalances] = await Promise.all([
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
  ])

  const revenueThisWeek = paymentsThisWeek.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalRevenue = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Forms & compliance
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

  // Support tickets
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

  // Events
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

/**
 * Generate action items based on stats
 */
function generateActionItems(
  stats: WeeklyDigestData['stats'],
  organizationId: string
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

  if (stats.overdueBalances > 0) {
    items.push({
      type: 'urgent',
      title: 'Overdue Payment Balances',
      description: 'Registrations with unpaid balances',
      count: stats.overdueBalances,
      actionUrl: `${APP_URL}/dashboard/admin/registrations?filter=overdue`,
    })
  }

  if (stats.openTickets > 0) {
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

/**
 * Get upcoming events for digest
 */
async function getUpcomingEvents(organizationId: string): Promise<WeeklyDigestData['upcomingEvents']> {
  const now = new Date()
  const events = await prisma.event.findMany({
    where: {
      organizationId,
      status: { not: 'draft' },
      startDate: { gte: now },
    },
    include: {
      _count: {
        select: {
          groupRegistrations: true,
          individualRegistrations: true,
        },
      },
      eventSettings: {
        select: {
          maxRegistrations: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
    take: 5,
  })

  return events.map(event => {
    const registrationCount = event._count.groupRegistrations + event._count.individualRegistrations
    const maxRegs = event.eventSettings?.maxRegistrations
    const spotsRemaining = maxRegs ? maxRegs - registrationCount : undefined

    return {
      name: event.name,
      startDate: event.startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      registrationCount,
      spotsRemaining,
    }
  })
}

/**
 * Get recent activity for digest
 */
async function getRecentActivity(
  organizationId: string,
  weekStart: Date
): Promise<WeeklyDigestData['recentActivity']> {
  // Get recent payments
  const recentPayments = await prisma.payment.findMany({
    where: {
      organizationId,
      paymentStatus: 'succeeded',
      createdAt: { gte: weekStart },
    },
    include: {
      groupRegistration: { select: { groupName: true } },
      individualRegistration: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  // Get recent registrations
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
    const name = payment.groupRegistration?.groupName
      || (payment.individualRegistration
        ? `${payment.individualRegistration.firstName} ${payment.individualRegistration.lastName}`
        : 'Unknown')

    activity.push({
      type: 'payment',
      description: `Payment of $${(Number(payment.amount) / 100).toFixed(2)} from ${name}`,
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

  // Sort by recency and limit
  return activity
    .sort((a, b) => {
      // Simple comparison for "ago" strings - this is approximate
      return 0
    })
    .slice(0, 5)
}

/**
 * Format time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    return 'Just now'
  }
}

/**
 * POST /api/cron/weekly-digest
 * Manual trigger to send digest to a specific organization or test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, testMode } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    // Build URL with params and call GET handler
    const url = new URL(request.url)
    url.searchParams.set('orgId', organizationId)
    if (testMode) {
      url.searchParams.set('test', 'true')
    }

    const newRequest = new NextRequest(url, {
      headers: request.headers,
    })

    return GET(newRequest)
  } catch (error) {
    console.error('POST weekly-digest error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
