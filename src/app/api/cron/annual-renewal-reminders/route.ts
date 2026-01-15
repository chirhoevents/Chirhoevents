import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { Resend } from 'resend'
import { addDays, isBefore, isAfter, differenceInDays } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

// Verify cron secret or master admin auth
async function verifyCronAuth(request: NextRequest): Promise<boolean> {
  // Check for cron secret (from Vercel Cron)
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // Also allow manual trigger from master admin via JWT token
  const clerkUserId = await getClerkUserIdFromRequest(request)
  if (clerkUserId) {
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { role: true },
    })
    return user?.role === 'master_admin'
  }

  return false
}

// Get tier display name
function getTierName(tier: string): string {
  const tierMap: Record<string, string> = {
    starter: 'Starter',
    parish: 'Parish',
    cathedral: 'Cathedral',
    shrine: 'Shrine',
    basilica: 'Basilica',
    small_diocese: 'Parish',
    growing: 'Cathedral',
    conference: 'Shrine',
    enterprise: 'Basilica',
  }
  return tierMap[tier] || tier
}

// Generate reminder email HTML
function generateReminderEmailHtml(params: {
  organizationName: string
  tierName: string
  renewalDate: Date
  annualAmount: number
  daysUntilRenewal: number
  billingAddress?: string | null
}): string {
  const { organizationName, tierName, renewalDate, annualAmount, daysUntilRenewal, billingAddress } = params
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(annualAmount)
  const formattedDate = renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const urgencyStyle = daysUntilRenewal <= 7 ? 'color: #DC2626;' : daysUntilRenewal <= 14 ? 'color: #D97706;' : 'color: #1E3A5F;'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
        <h1 style="color: white; margin: 0;">ChiRho Events</h1>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="${urgencyStyle} margin-top: 0;">
          Annual Subscription Renewal - ${daysUntilRenewal} Days Remaining
        </h2>

        <p>Dear ${organizationName},</p>

        <p>This is a friendly reminder that your <strong>${tierName}</strong> annual subscription is coming up for renewal.</p>

        <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0;"><strong>Subscription Plan:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0; text-align: right;">${tierName} (Annual)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0;"><strong>Renewal Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0; text-align: right;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0;"><strong>Annual Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0; text-align: right; font-size: 18px; color: #1E3A5F;"><strong>${formattedAmount}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Days Until Renewal:</strong></td>
              <td style="padding: 8px 0; text-align: right; ${urgencyStyle} font-weight: bold;">${daysUntilRenewal} days</td>
            </tr>
          </table>
        </div>

        <h3 style="color: #1E3A5F;">What You Need to Do:</h3>
        <p>An invoice will be sent to you shortly. You can pay via:</p>
        <ul>
          <li><strong>Online Payment:</strong> Use the payment link in the invoice email</li>
          <li><strong>Check:</strong> Make payable to "ChiRho Events" and mail to the address on the invoice</li>
        </ul>

        ${billingAddress ? `
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Physical Letter Notification:</strong></p>
          <p style="margin: 0; font-size: 14px;">A physical renewal letter will be mailed to your billing address on file:</p>
          <p style="margin: 10px 0 0 0; white-space: pre-line; font-size: 14px;">${billingAddress}</p>
        </div>
        ` : ''}

        <p style="color: #666; font-size: 14px;">
          If you have any questions about your renewal or would like to make changes to your subscription, please contact us at <a href="mailto:billing@chirhoevents.com">billing@chirhoevents.com</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">

        <p>Thank you for being part of the ChiRho Events community!</p>

        <p>God bless,<br><strong>ChiRho Events Team</strong></p>
      </div>

      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #F9F9F9;">
        <p>ChiRho Events - The Complete Catholic Registration Platform</p>
        <p><a href="mailto:billing@chirhoevents.com" style="color: #1E3A5F;">billing@chirhoevents.com</a></p>
      </div>
    </div>
  `
}

/**
 * GET /api/cron/annual-renewal-reminders
 *
 * Sends reminder emails for annual subscriptions that are coming up for renewal.
 * Reminders are sent at 30, 14, and 7 days before renewal.
 *
 * This endpoint also returns a list of organizations that need physical letters.
 *
 * Query params:
 * - dryRun: If "true", don't actually send emails, just return what would be sent
 */
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyCronAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'

    const now = new Date()
    const reminderDays = [30, 14, 7] // Days before renewal to send reminders

    // Find organizations with annual billing that are coming up for renewal
    const organizations = await prisma.organization.findMany({
      where: {
        billingCycle: 'annual',
        subscriptionStatus: 'active',
        subscriptionRenewsAt: {
          not: null,
          // Get orgs renewing within next 31 days
          lte: addDays(now, 31),
          gte: now,
        },
      },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        billingAddress: true,
        subscriptionTier: true,
        annualPrice: true,
        subscriptionRenewsAt: true,
      },
    })

    const results: Array<{
      organizationId: string
      organizationName: string
      email: string
      tierName: string
      renewalDate: Date
      daysUntilRenewal: number
      annualAmount: number
      needsPhysicalLetter: boolean
      billingAddress: string | null
      reminderSent: boolean
      error?: string
    }> = []

    for (const org of organizations) {
      if (!org.subscriptionRenewsAt) continue

      const daysUntilRenewal = differenceInDays(org.subscriptionRenewsAt, now)

      // Check if we should send a reminder for this day count
      const shouldSendReminder = reminderDays.some(days =>
        daysUntilRenewal === days ||
        (daysUntilRenewal >= days - 1 && daysUntilRenewal <= days + 1)
      )

      if (!shouldSendReminder) continue

      const email = org.contactEmail
      const tierName = getTierName(org.subscriptionTier)
      const annualAmount = org.annualPrice || 0

      const result = {
        organizationId: org.id,
        organizationName: org.name,
        email,
        tierName,
        renewalDate: org.subscriptionRenewsAt,
        daysUntilRenewal,
        annualAmount,
        needsPhysicalLetter: daysUntilRenewal <= 14, // Flag for physical letter at 14 days or less
        billingAddress: org.billingAddress,
        reminderSent: false,
        error: undefined as string | undefined,
      }

      if (!dryRun && email) {
        try {
          await resend.emails.send({
            from: 'ChiRho Events Billing <billing@chirhoevents.com>',
            to: email,
            subject: `Annual Subscription Renewal Reminder - ${daysUntilRenewal} Days`,
            html: generateReminderEmailHtml({
              organizationName: org.name,
              tierName,
              renewalDate: org.subscriptionRenewsAt,
              annualAmount,
              daysUntilRenewal,
              billingAddress: org.billingAddress,
            }),
          })
          result.reminderSent = true
        } catch (error) {
          result.error = error instanceof Error ? error.message : 'Failed to send email'
        }
      } else if (dryRun) {
        result.reminderSent = true // Would have been sent
      }

      results.push(result)
    }

    // Separate out orgs that need physical letters
    const physicalLettersNeeded = results.filter(r => r.needsPhysicalLetter && r.billingAddress)

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalOrganizations: organizations.length,
        remindersProcessed: results.length,
        remindersSent: results.filter(r => r.reminderSent && !r.error).length,
        errors: results.filter(r => r.error).length,
        physicalLettersNeeded: physicalLettersNeeded.length,
      },
      results,
      // List of orgs that need physical letters mailed
      physicalLettersList: physicalLettersNeeded.map(r => ({
        organizationName: r.organizationName,
        tierName: r.tierName,
        renewalDate: r.renewalDate,
        daysUntilRenewal: r.daysUntilRenewal,
        annualAmount: r.annualAmount,
        billingAddress: r.billingAddress,
      })),
    })
  } catch (error) {
    console.error('Annual renewal reminders error:', error)
    return NextResponse.json(
      { error: 'Failed to process renewal reminders' },
      { status: 500 }
    )
  }
}
