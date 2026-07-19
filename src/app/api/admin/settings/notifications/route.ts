import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

interface WeeklyDigestSettings {
  // Opt-out: the digest sends by default. Only stops when disabled === true.
  disabled: boolean
  recipients: string[]
}

interface UpdateEmailSettings {
  disabled: boolean
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
    const stored = customFields?.weeklyDigest || {}
    // Legacy: the old opt-in schema wrote `enabled: false` when off.
    // Preserve that as `disabled: true` under the new opt-out schema.
    const legacyDisabled = stored.enabled === false
    const weeklyDigest: WeeklyDigestSettings = {
      disabled: stored.disabled === true || legacyDisabled,
      recipients: Array.isArray(stored.recipients) ? stored.recipients : [],
    }
    const updateEmails: UpdateEmailSettings = customFields?.updateEmails || {
      disabled: false,
    }

    return NextResponse.json({
      weeklyDigest,
      updateEmails,
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

    const { weeklyDigest, updateEmails } = body

    if (!weeklyDigest) {
      return NextResponse.json(
        { error: 'weeklyDigest settings required' },
        { status: 400 }
      )
    }

    if (typeof weeklyDigest.disabled !== 'boolean') {
      return NextResponse.json(
        { error: 'disabled must be a boolean' },
        { status: 400 }
      )
    }

    if (!Array.isArray(weeklyDigest.recipients)) {
      return NextResponse.json(
        { error: 'recipients must be an array' },
        { status: 400 }
      )
    }

    if (updateEmails !== undefined && typeof updateEmails.disabled !== 'boolean') {
      return NextResponse.json(
        { error: 'updateEmails.disabled must be a boolean' },
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

    // Write the new opt-out shape. Drop legacy `enabled` / `dayOfWeek` keys
    // so the stored blob stops carrying dead fields.
    const updatedCustomFields = {
      ...currentCustomFields,
      weeklyDigest: {
        disabled: weeklyDigest.disabled,
        recipients: weeklyDigest.recipients,
      },
      updateEmails: {
        disabled: updateEmails?.disabled ?? (currentCustomFields.updateEmails?.disabled ?? false),
      },
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { customFieldsEnabled: updatedCustomFields },
    })

    return NextResponse.json({
      success: true,
      weeklyDigest: updatedCustomFields.weeklyDigest,
      updateEmails: updatedCustomFields.updateEmails,
    })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/admin/settings/notifications
 * Send a weekly digest email immediately.
 *
 * Body (all optional):
 * - recipients: string[] — explicit email list; if omitted, uses configured recipients
 * - asTest: boolean — prefix subject with [TEST] and log as 'weekly_digest_test' (default: true)
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

    let body: { recipients?: unknown; asTest?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const explicitRecipients = Array.isArray(body.recipients)
      ? body.recipients.filter((r): r is string => typeof r === 'string').map(r => r.trim()).filter(Boolean)
      : null

    if (explicitRecipients) {
      const invalid = explicitRecipients.filter(r => !EMAIL_REGEX.test(r))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid email address(es): ${invalid.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const asTest = body.asTest === undefined ? true : body.asTest === true

    const { Resend } = await import('resend')
    const { generateWeeklyDigestEmail, generateWeeklyDigestSubject } = await import('@/lib/weekly-digest')
    const { buildOrganizationDigest, getDigestSettings } = await import('@/lib/weekly-digest-data')
    const { logEmail, logEmailFailure } = await import('@/lib/email-logger')

    const resend = new Resend(process.env.RESEND_API_KEY)

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

    let recipients: string[]
    if (explicitRecipients && explicitRecipients.length > 0) {
      recipients = Array.from(new Set(explicitRecipients))
    } else {
      const digestSettings = getDigestSettings(organization.customFieldsEnabled as Record<string, any>)
      recipients = digestSettings.recipients
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided. Configure recipients in Settings or pass recipients in the request body.' },
        { status: 400 }
      )
    }

    const digestData = await buildOrganizationDigest(
      organizationId,
      organization.name,
      organization.users[0]?.firstName || 'Admin'
    )

    const baseSubject = generateWeeklyDigestSubject(organization.name, digestData.dateRange)
    const subject = asTest ? `[TEST] ${baseSubject}` : baseSubject
    const emailType = asTest ? 'weekly_digest_test' : 'weekly_digest_manual'

    let sentCount = 0
    const failures: { email: string; error: string }[] = []

    for (const recipientEmail of recipients) {
      const recipientUser = organization.users.find((u: { email: string; firstName: string | null }) => u.email === recipientEmail)
      const personalizedDigest = {
        ...digestData,
        recipientName: recipientUser?.firstName || 'Admin',
      }
      const htmlContent = generateWeeklyDigestEmail(personalizedDigest)

      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          to: recipientEmail,
          subject,
          html: htmlContent,
        })
        sentCount++

        await logEmail({
          organizationId,
          recipientEmail,
          recipientName: recipientUser?.firstName ?? undefined,
          emailType,
          subject,
          htmlContent,
        })
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : 'Unknown error'
        console.error(`Failed to send digest to ${recipientEmail}:`, emailError)
        failures.push({ email: recipientEmail, error: message })

        await logEmailFailure(
          {
            organizationId,
            recipientEmail,
            recipientName: recipientUser?.firstName ?? undefined,
            emailType,
            subject,
            htmlContent,
          },
          message
        )
      }
    }

    return NextResponse.json({
      success: sentCount > 0,
      results: [{ recipients: sentCount, status: sentCount > 0 ? 'sent' : 'failed' }],
      failures,
    })
  } catch (error) {
    console.error('Error sending test digest:', error)
    return NextResponse.json(
      { error: 'Failed to send test digest. Check server logs for details.' },
      { status: 500 }
    )
  }
}
