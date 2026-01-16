import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

interface WeeklyDigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek: number
}

interface PaymentAmount {
  amount: number | bigint | { toNumber?: () => number }
}

/**
 * GET /api/admin/settings/notifications
 * Get notification settings for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        customFieldsEnabled: true,
        users: {
          where: { role: { in: ['org_admin', 'master_admin', 'event_manager'] } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const customFields = organization.customFieldsEnabled as Record<string, any> | null
    const weeklyDigest: WeeklyDigestSettings = customFields?.weeklyDigest || {
      enabled: false,
      recipients: [],
      dayOfWeek: 0, // Sunday
    }

    return NextResponse.json({
      weeklyDigest,
      availableRecipients: organization.users,
    })
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/settings/notifications
 * Update notification settings for the organization
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)
    const body = await request.json()

    const { weeklyDigest } = body

    if (!weeklyDigest) {
      return NextResponse.json(
        { error: 'weeklyDigest settings required' },
        { status: 400 }
      )
    }

    // Validate settings
    if (typeof weeklyDigest.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (!Array.isArray(weeklyDigest.recipients)) {
      return NextResponse.json(
        { error: 'recipients must be an array' },
        { status: 400 }
      )
    }

    if (typeof weeklyDigest.dayOfWeek !== 'number' || weeklyDigest.dayOfWeek < 0 || weeklyDigest.dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'dayOfWeek must be a number between 0 and 6' },
        { status: 400 }
      )
    }

    // Get current custom fields
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { customFieldsEnabled: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const currentCustomFields = (organization.customFieldsEnabled as Record<string, any>) || {}

    // Update with new weekly digest settings
    const updatedCustomFields = {
      ...currentCustomFields,
      weeklyDigest: {
        enabled: weeklyDigest.enabled,
        recipients: weeklyDigest.recipients,
        dayOfWeek: weeklyDigest.dayOfWeek,
      },
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { customFieldsEnabled: updatedCustomFields },
    })

    return NextResponse.json({
      success: true,
      weeklyDigest: updatedCustomFields.weeklyDigest,
    })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings/notifications
 * Send a test digest email by directly calling the weekly digest logic
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    // Import the Resend client and email generator
    const { Resend } = await import('resend')
    const { generateWeeklyDigestEmail, generateWeeklyDigestSubject } = await import('@/lib/weekly-digest')

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Get organization with settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        customFieldsEnabled: true,
        users: {
          where: { role: { in: ['org_admin', 'master_admin', 'event_manager'] } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const customFields = organization.customFieldsEnabled as Record<string, unknown> | null
    const weeklyDigest = customFields?.weeklyDigest as { enabled?: boolean; recipients?: string[] } | undefined

    const recipients = weeklyDigest?.recipients || []

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients selected. Please select at least one recipient and save settings first.' },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)

    const dateRange = {
      start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }

    // Basic stats for test email
    const [totalRegs, revenue] = await Promise.all([
      prisma.groupRegistration.count({ where: { organizationId } }),
      prisma.payment.findMany({
        where: { organizationId, paymentStatus: 'succeeded' },
        select: { amount: true },
      }),
    ])

    const totalRevenue = revenue.reduce((sum: number, p: PaymentAmount) => sum + Number(p.amount), 0)

    const digestData = {
      organizationName: organization.name,
      recipientName: organization.users[0]?.firstName || 'Admin',
      dateRange,
      stats: {
        newRegistrationsThisWeek: 0,
        totalRegistrations: totalRegs,
        newParticipantsThisWeek: 0,
        totalParticipants: 0,
        revenueThisWeek: 0,
        totalRevenue: totalRevenue / 100,
        pendingPayments: 0,
        overdueBalances: 0,
        formsCompletedThisWeek: 0,
        formsTotal: 0,
        formsPending: 0,
        pendingCertificates: 0,
        activeEvents: 0,
        upcomingEventsCount: 0,
      },
      upcomingEvents: [],
      actionItems: [],
      recentActivity: [],
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/dashboard/admin`,
    }

    const subject = generateWeeklyDigestSubject(organization.name, dateRange)
    const htmlContent = generateWeeklyDigestEmail(digestData)

    let sentCount = 0

    for (const recipientEmail of recipients) {
      try {
        await resend.emails.send({
          from: 'ChiRho Events <noreply@chirhoevents.com>',
          to: recipientEmail,
          subject: `[TEST] ${subject}`,
          html: htmlContent,
        })
        sentCount++
      } catch (emailError) {
        console.error(`Failed to send test digest to ${recipientEmail}:`, emailError)
      }
    }

    return NextResponse.json({
      success: true,
      results: [{ recipients: sentCount, status: 'sent' }],
    })
  } catch (error) {
    console.error('Error sending test digest:', error)
    return NextResponse.json(
      { error: 'Failed to send test digest. Check server logs for details.' },
      { status: 500 }
    )
  }
}
