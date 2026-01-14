import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface MasterDigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek: number
}

/**
 * GET /api/master-admin/settings/notifications
 * Get master admin notification settings
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master admin access required' },
        { status: 403 }
      )
    }

    // Get platform settings from PlatformSetting table
    const setting = await prisma.platformSetting.findUnique({
      where: { settingKey: 'master_digest_settings' },
    })

    const masterDigest: MasterDigestSettings = setting?.settingValue
      ? (JSON.parse(setting.settingValue) as MasterDigestSettings)
      : {
          enabled: false,
          recipients: [],
          dayOfWeek: 0,
        }

    return NextResponse.json({ masterDigest })
  } catch (error) {
    console.error('Error fetching master admin notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/master-admin/settings/notifications
 * Update master admin notification settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { masterDigest } = body

    if (!masterDigest) {
      return NextResponse.json(
        { error: 'masterDigest settings required' },
        { status: 400 }
      )
    }

    // Validate settings
    if (typeof masterDigest.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (!Array.isArray(masterDigest.recipients)) {
      return NextResponse.json(
        { error: 'recipients must be an array' },
        { status: 400 }
      )
    }

    if (typeof masterDigest.dayOfWeek !== 'number' || masterDigest.dayOfWeek < 0 || masterDigest.dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'dayOfWeek must be a number between 0 and 6' },
        { status: 400 }
      )
    }

    // Upsert the platform setting
    await prisma.platformSetting.upsert({
      where: { settingKey: 'master_digest_settings' },
      update: {
        settingValue: JSON.stringify({
          enabled: masterDigest.enabled,
          recipients: masterDigest.recipients,
          dayOfWeek: masterDigest.dayOfWeek,
        }),
      },
      create: {
        settingKey: 'master_digest_settings',
        settingValue: JSON.stringify({
          enabled: masterDigest.enabled,
          recipients: masterDigest.recipients,
          dayOfWeek: masterDigest.dayOfWeek,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      masterDigest: {
        enabled: masterDigest.enabled,
        recipients: masterDigest.recipients,
        dayOfWeek: masterDigest.dayOfWeek,
      },
    })
  } catch (error) {
    console.error('Error updating master admin notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/master-admin/settings/notifications
 * Send a test master admin digest email
 */
export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master admin access required' },
        { status: 403 }
      )
    }

    // Get settings
    const setting = await prisma.platformSetting.findUnique({
      where: { settingKey: 'master_digest_settings' },
    })

    const masterDigest = setting?.settingValue ? JSON.parse(setting.settingValue) as MasterDigestSettings : undefined

    if (!masterDigest?.recipients?.length) {
      return NextResponse.json(
        { error: 'No recipients configured. Please add recipients and save settings first.' },
        { status: 400 }
      )
    }

    // Import Resend
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Get platform stats
    const [
      openTickets,
      pendingRequests,
      activeOrgs,
      totalRevenue,
    ] = await Promise.all([
      prisma.supportTicket.count({
        where: { status: { in: ['open', 'in_progress'] } },
      }),
      prisma.organization.count({
        where: { status: 'pending' },
      }),
      prisma.organization.count({
        where: { status: 'active' },
      }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'succeeded' },
        _sum: { amount: true },
      }),
    ])

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)

    const dateRange = {
      start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }

    // Generate simple HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7C3AED; color: white; padding: 20px; text-align: center; }
          .stat-card { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #7C3AED; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Master Admin Weekly Digest</h1>
            <p>${dateRange.start} - ${dateRange.end}</p>
          </div>

          <h2>Platform Overview</h2>

          <div class="stat-card">
            <div class="stat-value">${openTickets}</div>
            <div>Open Support Tickets</div>
          </div>

          <div class="stat-card">
            <div class="stat-value">${pendingRequests}</div>
            <div>Pending Organization Requests</div>
          </div>

          <div class="stat-card">
            <div class="stat-value">${activeOrgs}</div>
            <div>Active Organizations</div>
          </div>

          <div class="stat-card">
            <div class="stat-value">$${((Number(totalRevenue._sum.amount) || 0) / 100).toLocaleString()}</div>
            <div>Total Platform Revenue</div>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is a test email from ChiRho Events Master Admin digest.
          </p>
        </div>
      </body>
      </html>
    `

    let sentCount = 0

    for (const recipientEmail of masterDigest.recipients) {
      try {
        await resend.emails.send({
          from: 'ChiRho Events <noreply@chirhoevents.com>',
          to: recipientEmail,
          subject: `[TEST] ChiRho Events - Master Admin Weekly Digest (${dateRange.start} - ${dateRange.end})`,
          html: htmlContent,
        })
        sentCount++
      } catch (emailError) {
        console.error(`Failed to send master digest to ${recipientEmail}:`, emailError)
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
    })
  } catch (error) {
    console.error('Error sending master admin test digest:', error)
    return NextResponse.json(
      { error: 'Failed to send test digest. Check server logs for details.' },
      { status: 500 }
    )
  }
}
