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

    // Get platform stats with full details
    const [
      supportTickets,
      pendingOrganizations,
      activeOrgsCount,
      totalRevenue,
    ] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { status: { in: ['open', 'in_progress'] } },
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          organization: { select: { name: true } },
          submittedByUser: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.organization.findMany({
        where: { status: 'pending' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          users: {
            where: { role: 'org_admin' },
            select: { firstName: true, lastName: true, email: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
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

    // Helper function to get status badge color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'open': return '#ef4444'
        case 'in_progress': return '#f59e0b'
        case 'resolved': return '#10b981'
        case 'closed': return '#6b7280'
        default: return '#6b7280'
      }
    }

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return '#dc2626'
        case 'high': return '#f97316'
        case 'medium': return '#eab308'
        case 'low': return '#22c55e'
        default: return '#6b7280'
      }
    }

    // Generate tickets HTML
    const ticketsHtml = supportTickets.length > 0
      ? supportTickets.map(ticket => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px;">
            <strong>${ticket.subject}</strong><br/>
            <span style="color: #6b7280; font-size: 12px;">
              ${ticket.organization?.name || 'No org'} • ${ticket.submittedByUser?.firstName || ''} ${ticket.submittedByUser?.lastName || ''}
            </span>
          </td>
          <td style="padding: 12px 8px; text-align: center;">
            <span style="background: ${getStatusColor(ticket.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">
              ${ticket.status.replace('_', ' ')}
            </span>
          </td>
          <td style="padding: 12px 8px; text-align: center;">
            <span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">
              ${ticket.priority}
            </span>
          </td>
          <td style="padding: 12px 8px; text-align: right; color: #6b7280; font-size: 12px;">
            ${new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </td>
        </tr>
      `).join('')
      : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #6b7280;">No open support tickets</td></tr>'

    // Generate pending orgs HTML
    const pendingOrgsHtml = pendingOrganizations.length > 0
      ? pendingOrganizations.map(org => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px;">
            <strong>${org.name}</strong>
          </td>
          <td style="padding: 12px 8px;">
            ${org.users[0] ? `${org.users[0].firstName || ''} ${org.users[0].lastName || ''}<br/><span style="color: #6b7280; font-size: 12px;">${org.users[0].email}</span>` : 'No admin'}
          </td>
          <td style="padding: 12px 8px; text-align: right; color: #6b7280; font-size: 12px;">
            ${new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
        </tr>
      `).join('')
      : '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #6b7280;">No pending organization requests</td></tr>'

    // Generate full HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #7C3AED; color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; }
          .header p { margin: 0; opacity: 0.9; }
          .section { margin: 30px 0; }
          .section h2 { color: #1f2937; border-bottom: 2px solid #7C3AED; padding-bottom: 10px; margin-bottom: 20px; }
          .stats-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px; }
          .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; flex: 1; min-width: 140px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; color: #7C3AED; }
          .stat-label { color: #6b7280; font-size: 14px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 12px 8px; background: #f3f4f6; font-weight: 600; color: #374151; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Master Admin Weekly Digest</h1>
            <p>${dateRange.start} - ${dateRange.end}</p>
          </div>

          <div class="section">
            <h2>Platform Overview</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${supportTickets.length}</div>
                <div class="stat-label">Open Tickets</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${pendingOrganizations.length}</div>
                <div class="stat-label">Pending Requests</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${activeOrgsCount}</div>
                <div class="stat-label">Active Orgs</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">$${((Number(totalRevenue._sum.amount) || 0) / 100).toLocaleString()}</div>
                <div class="stat-label">Total Revenue</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Support Tickets (${supportTickets.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: center;">Priority</th>
                  <th style="text-align: right;">Created</th>
                </tr>
              </thead>
              <tbody>
                ${ticketsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Pending Organization Requests (${pendingOrganizations.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Contact</th>
                  <th style="text-align: right;">Requested</th>
                </tr>
              </thead>
              <tbody>
                ${pendingOrgsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>This is a test email from ChiRho Events Master Admin digest.</p>
            <p>View full details at <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/dashboard/master-admin" style="color: #7C3AED;">Master Admin Dashboard</a></p>
          </div>
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
