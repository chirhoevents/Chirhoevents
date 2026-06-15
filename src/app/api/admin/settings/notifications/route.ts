import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

interface WeeklyDigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek: number
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
    const weeklyDigest: WeeklyDigestSettings = customFields?.weeklyDigest || {
      enabled: false,
      recipients: [],
      dayOfWeek: 0, // Sunday
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

    // Update with new weekly digest settings
    const updatedCustomFields = {
      ...currentCustomFields,
      weeklyDigest: {
        enabled: weeklyDigest.enabled,
        recipients: weeklyDigest.recipients,
        dayOfWeek: weeklyDigest.dayOfWeek,
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

    const digestSettings = getDigestSettings(organization.customFieldsEnabled as Record<string, any>)
    const recipients = digestSettings.recipients

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients selected. Please select at least one recipient and save settings first.' },
        { status: 400 }
      )
    }

    const digestData = await buildOrganizationDigest(
      organizationId,
      organization.name,
      organization.users[0]?.firstName || 'Admin'
    )

    const subject = generateWeeklyDigestSubject(organization.name, digestData.dateRange)
    const testSubject = `[TEST] ${subject}`

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
          subject: testSubject,
          html: htmlContent,
        })
        sentCount++

        await logEmail({
          organizationId,
          recipientEmail,
          recipientName: recipientUser?.firstName ?? undefined,
          emailType: 'weekly_digest_test',
          subject: testSubject,
          htmlContent,
        })
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : 'Unknown error'
        console.error(`Failed to send test digest to ${recipientEmail}:`, emailError)
        failures.push({ email: recipientEmail, error: message })

        await logEmailFailure(
          {
            organizationId,
            recipientEmail,
            recipientName: recipientUser?.firstName ?? undefined,
            emailType: 'weekly_digest_test',
            subject: testSubject,
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
