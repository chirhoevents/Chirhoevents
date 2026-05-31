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

    // Default settings if none exist.
    // Note: setup_fee is now per-tier (see chapel/parish/cathedral/shrine_setup_fee).
    // 'starter' renders as "Chapel" — DB enum value preserved for backward compat.
    const defaults: Record<string, string> = {
      platform_name: 'ChiRho Events',
      support_email: 'support@chirhoevents.com',
      billing_email: 'billing@chirhoevents.com',
      trial_days: '14',
      default_tier: 'cathedral',
      maintenance_mode: 'false',
      allow_new_signups: 'true',
      require_approval: 'true',
      stripe_enabled: 'true',
      invoice_enabled: 'true',
      ach_enabled: 'false',
      check_enabled: 'true',
      check_payable_to: 'ChiRho Events',
      billing_address_line1: '',
      billing_address_line2: '',
      billing_address_city: '',
      billing_address_state: '',
      billing_address_zip: '',
      // Per-tier monthly / annual / setup or access fees
      starter_monthly: '39',
      starter_annual: '468',
      starter_setup_fee: '99',
      parish_monthly: '59',
      parish_annual: '708',
      parish_setup_fee: '199',
      cathedral_monthly: '109',
      cathedral_annual: '1080',
      cathedral_setup_fee: '349',
      shrine_monthly: '159',
      shrine_annual: '1908',
      shrine_setup_fee: '499',
      basilica_annual: '15000',
      // Consulting packages
      guided_setup_price: '199',
      full_implementation_price: '499',
      consulting_hourly_rate: '75',
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
