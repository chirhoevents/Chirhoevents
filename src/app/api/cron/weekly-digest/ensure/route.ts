import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { generateWeeklyDigestEmail, generateWeeklyDigestSubject } from '@/lib/weekly-digest'
import { buildOrganizationDigest, getDigestSettings } from '@/lib/weekly-digest-data'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/cron/weekly-digest/ensure
 *
 * Vercel-Cron-independent fallback for the weekly digest. Any org admin
 * hitting this (typically fired once per session by the admin layout on
 * mount) makes sure THIS org has received its Monday digest. Idempotent
 * — if the last successful digest for this org is under 7 days old, it
 * no-ops. If the org is explicitly opted out, it no-ops.
 *
 * The purpose is a safety net: if Vercel Cron misfires, doesn't deploy,
 * hits an env issue, or gets rate-limited, the digest still lands the
 * first time an admin visits the dashboard on Monday.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const MONDAY = 1
    const todayDayOfWeek = new Date().getUTCDay()

    // Only fire on Mondays. On other days the regular cron's catch-up path
    // handles a missed Monday; the fallback exists specifically for the
    // Monday scheduled slot.
    if (todayDayOfWeek !== MONDAY) {
      return NextResponse.json({ status: 'not_monday', dayOfWeek: todayDayOfWeek })
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        customFieldsEnabled: true,
        users: {
          where: { role: { in: ['org_admin', 'master_admin', 'event_manager'] } },
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const digestSettings = getDigestSettings(org.customFieldsEnabled as Record<string, any>)
    if (digestSettings.disabled) {
      return NextResponse.json({ status: 'disabled' })
    }

    // Idempotency: skip if we've already sent successfully in the past 6 days.
    // 6 (not 7) leaves headroom for a same-Monday duplicate firing.
    const lastDigest = await prisma.emailLog.findFirst({
      where: {
        organizationId: org.id,
        emailType: 'weekly_digest',
        sentStatus: 'sent',
      },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })
    if (lastDigest) {
      const daysSinceLast = (Date.now() - lastDigest.sentAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLast < 6) {
        return NextResponse.json({
          status: 'already_sent',
          daysSinceLast: Math.round(daysSinceLast * 10) / 10,
        })
      }
    }

    const recipients = digestSettings.recipients.length > 0
      ? digestSettings.recipients
      : org.users.map(u => u.email)
    if (recipients.length === 0) {
      return NextResponse.json({ status: 'no_recipients' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY!)
    const digestData = await buildOrganizationDigest(
      org.id,
      org.name,
      org.users[0]?.firstName || 'Admin'
    )
    const subject = generateWeeklyDigestSubject(org.name, digestData.dateRange)

    console.log(`[weekly-digest/ensure] Sending ${org.id} (${org.name}) to ${recipients.length} recipient(s) — triggered by ${user.email}`)

    let sent = 0
    const failures: string[] = []
    for (const recipientEmail of recipients) {
      const recipientUser = org.users.find(u => u.email === recipientEmail)
      const personalizedDigest = {
        ...digestData,
        recipientName: recipientUser?.firstName || 'Admin',
      }
      const html = generateWeeklyDigestEmail(personalizedDigest)

      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          to: recipientEmail,
          subject,
          html,
        })
        await logEmail({
          organizationId: org.id,
          recipientEmail,
          recipientName: recipientUser?.firstName ?? undefined,
          emailType: 'weekly_digest',
          subject,
          htmlContent: html,
        })
        sent++
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : 'Unknown error'
        failures.push(`${recipientEmail}: ${message}`)
        await logEmailFailure(
          {
            organizationId: org.id,
            recipientEmail,
            recipientName: recipientUser?.firstName ?? undefined,
            emailType: 'weekly_digest',
            subject,
            htmlContent: html,
          },
          message
        )
      }
    }

    return NextResponse.json({
      status: sent > 0 ? 'sent' : 'failed',
      sent,
      failures,
    })
  } catch (error) {
    console.error('[weekly-digest/ensure] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
