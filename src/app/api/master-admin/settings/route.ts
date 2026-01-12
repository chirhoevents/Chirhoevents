import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// Get all platform settings
export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await prisma.platformSetting.findMany({
      orderBy: { settingKey: 'asc' },
    })

    type SettingType = typeof settings[0]

    // Convert to object format
    const settingsObj: Record<string, string> = {}
    settings.forEach((s: SettingType) => {
      settingsObj[s.settingKey] = s.settingValue
    })

    // Default settings if none exist
    const defaults: Record<string, string> = {
      platform_name: 'ChiRho Events',
      support_email: 'support@chirhoevents.com',
      billing_email: 'billing@chirhoevents.com',
      setup_fee: '250',
      trial_days: '14',
      default_tier: 'growing',
      maintenance_mode: 'false',
      allow_new_signups: 'true',
      require_approval: 'true',
      stripe_enabled: 'true',
      invoice_enabled: 'true',
      ach_enabled: 'false',
      starter_monthly: '29',
      starter_annual: '290',
      small_diocese_monthly: '49',
      small_diocese_annual: '490',
      growing_monthly: '79',
      growing_annual: '790',
      conference_monthly: '99',
      conference_annual: '990',
      enterprise_monthly: '199',
      enterprise_annual: '1990',
    }

    // Merge with defaults
    const mergedSettings = { ...defaults, ...settingsObj }

    return NextResponse.json({ settings: mergedSettings })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// Update platform settings
export async function PUT(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object required' },
        { status: 400 }
      )
    }

    // Upsert each setting
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.platformSetting.upsert({
        where: { settingKey: key },
        create: {
          settingKey: key,
          settingValue: String(value),
          updatedByUserId: user.id,
        },
        update: {
          settingValue: String(value),
          updatedByUserId: user.id,
        },
      })
    )

    await prisma.$transaction(updates)

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        userId: user.id,
        activityType: 'settings_updated',
        description: `Updated platform settings: ${Object.keys(settings).join(', ')}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
