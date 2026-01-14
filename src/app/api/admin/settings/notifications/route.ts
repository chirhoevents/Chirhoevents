import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

interface WeeklyDigestSettings {
  enabled: boolean
  recipients: string[]
  dayOfWeek: number
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
 * POST /api/admin/settings/notifications/test-digest
 * Send a test digest email
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

    // Call the weekly digest endpoint with test mode
    const digestUrl = new URL('/api/cron/weekly-digest', request.url)
    digestUrl.searchParams.set('orgId', organizationId)
    digestUrl.searchParams.set('test', 'false') // Actually send the test

    const response = await fetch(digestUrl.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    })

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error sending test digest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
