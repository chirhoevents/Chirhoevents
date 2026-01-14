/**
 * Weekly Digest Email Template and Data Generation
 * Sends a summary of organization activity to admins
 */

import { wrapEmail, emailButton, emailInfoBox, emailDetailRow } from './email-templates'

export interface WeeklyDigestData {
  organizationName: string
  recipientName: string
  dateRange: {
    start: string
    end: string
  }
  stats: {
    // Registration metrics
    newRegistrationsThisWeek: number
    totalRegistrations: number
    newParticipantsThisWeek: number
    totalParticipants: number

    // Financial metrics
    revenueThisWeek: number
    totalRevenue: number
    pendingPayments: number
    overdueBalances: number

    // Forms & Compliance
    formsCompletedThisWeek: number
    formsTotal: number
    formsPending: number
    pendingCertificates: number

    // Support
    openTickets: number
    ticketsResolvedThisWeek: number
    newTicketsThisWeek: number

    // Events
    activeEvents: number
    upcomingEventsCount: number
  }
  upcomingEvents: Array<{
    name: string
    startDate: string
    registrationCount: number
    spotsRemaining?: number
  }>
  actionItems: Array<{
    type: 'warning' | 'info' | 'urgent'
    title: string
    description: string
    count?: number
    actionUrl?: string
  }>
  recentActivity: Array<{
    type: string
    description: string
    time: string
  }>
  dashboardUrl: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

/**
 * Format currency in cents to display format
 */
function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountInCents / 100)
}

/**
 * Generate a stat card for the email
 */
function statCard(label: string, value: string | number, change?: { value: number; isPositive: boolean }): string {
  const changeHtml = change ? `
    <span style="font-size: 12px; color: ${change.isPositive ? '#059669' : '#DC2626'}; margin-left: 8px;">
      ${change.isPositive ? '+' : ''}${change.value} this week
    </span>
  ` : ''

  return `
    <td style="width: 25%; padding: 16px; text-align: center; background: #f9f9f9; border-radius: 8px;">
      <div style="font-size: 28px; font-weight: 700; color: #1E3A5F; margin-bottom: 4px;">${value}</div>
      <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
      ${changeHtml}
    </td>
  `
}

/**
 * Generate an action item row
 */
function actionItemRow(item: WeeklyDigestData['actionItems'][0]): string {
  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    info: { bg: '#EBF5FF', border: '#3B82F6', text: '#1E40AF' },
    urgent: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  }
  const c = colors[item.type]

  return `
    <tr>
      <td style="padding: 12px 16px; background: ${c.bg}; border-left: 4px solid ${c.border}; margin-bottom: 8px; border-radius: 0 4px 4px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <strong style="color: ${c.text};">${item.title}</strong>
              ${item.count ? `<span style="background: ${c.border}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">${item.count}</span>` : ''}
              <p style="margin: 4px 0 0; color: #666; font-size: 14px;">${item.description}</p>
            </td>
            ${item.actionUrl ? `
              <td style="text-align: right; width: 100px;">
                <a href="${item.actionUrl}" style="color: ${c.text}; text-decoration: none; font-size: 14px; font-weight: 600;">View &rarr;</a>
              </td>
            ` : ''}
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>
  `
}

/**
 * Generate the weekly digest email HTML
 */
export function generateWeeklyDigestEmail(data: WeeklyDigestData): string {
  const actionItemsHtml = data.actionItems.length > 0
    ? data.actionItems.map(actionItemRow).join('')
    : `
      <tr>
        <td style="padding: 20px; background: #ECFDF5; border-left: 4px solid #10B981; border-radius: 0 4px 4px 0; text-align: center;">
          <strong style="color: #065F46;">All caught up!</strong>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px;">No pending action items this week.</p>
        </td>
      </tr>
    `

  const upcomingEventsHtml = data.upcomingEvents.length > 0
    ? data.upcomingEvents.map(event => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <strong style="color: #1E3A5F;">${event.name}</strong>
                  <p style="margin: 4px 0 0; color: #666; font-size: 14px;">${event.startDate}</p>
                </td>
                <td style="text-align: right;">
                  <span style="font-size: 14px; color: #1E3A5F;"><strong>${event.registrationCount}</strong> registered</span>
                  ${event.spotsRemaining !== undefined ? `<br><span style="font-size: 12px; color: ${event.spotsRemaining < 10 ? '#DC2626' : '#666'};">${event.spotsRemaining} spots left</span>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `).join('')
    : `
      <tr>
        <td style="padding: 20px; text-align: center; color: #666;">
          No upcoming events scheduled.
        </td>
      </tr>
    `

  const recentActivityHtml = data.recentActivity.length > 0
    ? data.recentActivity.slice(0, 5).map(activity => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #1E3A5F;">${activity.description}</span>
            <span style="color: #999; font-size: 12px; float: right;">${activity.time}</span>
          </td>
        </tr>
      `).join('')
    : `
      <tr>
        <td style="padding: 12px 0; text-align: center; color: #666;">
          No recent activity this week.
        </td>
      </tr>
    `

  return wrapEmail(`
    <h1 style="margin-top: 0;">Weekly Digest</h1>

    <p>Hi ${data.recipientName},</p>

    <p>Here's your weekly summary for <strong>${data.organizationName}</strong> from ${data.dateRange.start} to ${data.dateRange.end}.</p>

    <!-- Quick Stats -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin: 24px 0;">
      <tr>
        ${statCard('Registrations', data.stats.totalRegistrations, { value: data.stats.newRegistrationsThisWeek, isPositive: true })}
        <td style="width: 8px;"></td>
        ${statCard('Revenue', formatCurrency(data.stats.totalRevenue), { value: data.stats.revenueThisWeek > 0 ? Math.round(data.stats.revenueThisWeek / 100) : 0, isPositive: true })}
        <td style="width: 8px;"></td>
        ${statCard('Forms Done', `${data.stats.formsCompletedThisWeek}`, { value: data.stats.formsCompletedThisWeek, isPositive: true })}
        <td style="width: 8px;"></td>
        ${statCard('Open Tickets', data.stats.openTickets.toString())}
      </tr>
    </table>

    <!-- Action Items -->
    <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 8px; margin-top: 32px;">
      Action Items
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      ${actionItemsHtml}
    </table>

    <!-- Financial Summary -->
    <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 8px; margin-top: 32px;">
      Financial Summary
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow('Revenue This Week', formatCurrency(data.stats.revenueThisWeek))}
            ${emailDetailRow('Total Revenue', formatCurrency(data.stats.totalRevenue))}
            ${emailDetailRow('Pending Check Payments', data.stats.pendingPayments.toString())}
            ${emailDetailRow('Overdue Balances', data.stats.overdueBalances.toString())}
          </table>
        </td>
      </tr>
    </table>

    <!-- Registration & Forms -->
    <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 8px; margin-top: 32px;">
      Registrations & Forms
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow('New Registrations This Week', data.stats.newRegistrationsThisWeek.toString())}
            ${emailDetailRow('New Participants This Week', data.stats.newParticipantsThisWeek.toString())}
            ${emailDetailRow('Forms Completed This Week', data.stats.formsCompletedThisWeek.toString())}
            ${emailDetailRow('Forms Still Pending', data.stats.formsPending.toString())}
            ${emailDetailRow('Pending Safe Environment Certs', data.stats.pendingCertificates.toString())}
          </table>
        </td>
      </tr>
    </table>

    <!-- Upcoming Events -->
    <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 8px; margin-top: 32px;">
      Upcoming Events
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      ${upcomingEventsHtml}
    </table>

    <!-- Support Tickets -->
    <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 8px; margin-top: 32px;">
      Support Tickets
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow('Open Tickets', data.stats.openTickets.toString())}
            ${emailDetailRow('New This Week', data.stats.newTicketsThisWeek.toString())}
            ${emailDetailRow('Resolved This Week', data.stats.ticketsResolvedThisWeek.toString())}
          </table>
        </td>
      </tr>
    </table>

    <!-- Recent Activity -->
    <h2 style="color: #1E3A5F; border-bottom: 2px solid #9C8466; padding-bottom: 8px; margin-top: 32px;">
      Recent Activity
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      ${recentActivityHtml}
    </table>

    <!-- CTA -->
    <div style="text-align: center; margin: 32px 0;">
      ${emailButton('View Full Dashboard', data.dashboardUrl, 'primary')}
    </div>

    <p style="font-size: 14px; color: #666; text-align: center; margin-top: 32px;">
      You're receiving this because you have weekly digest emails enabled for ${data.organizationName}.<br>
      <a href="${APP_URL}/dashboard/admin/settings/notifications" style="color: #9C8466;">Manage email preferences</a>
    </p>
  `, {
    organizationName: data.organizationName,
    preheader: `Your weekly summary: ${data.stats.newRegistrationsThisWeek} new registrations, ${formatCurrency(data.stats.revenueThisWeek)} revenue`
  })
}

/**
 * Generate email subject for weekly digest
 */
export function generateWeeklyDigestSubject(organizationName: string, dateRange: { start: string; end: string }): string {
  return `Weekly Digest: ${organizationName} (${dateRange.start} - ${dateRange.end})`
}
