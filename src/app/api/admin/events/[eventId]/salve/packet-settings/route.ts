import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

const DEFAULT_PACKET_SETTINGS = {
  includeSchedule: true,
  includeConfessionSchedule: true,
  includeMap: true,
  includeRoster: true,
  includeHousingAssignments: true,
  includeEmergencyContacts: true,
  includeInvoice: false,
}

// Helper function to check if user can access Salve portal
async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Check if user has salve.access permission (covers salve_coordinator, event_manager, org_admin, master_admin)
  // Also check custom permissions for salve_user role or explicit portal access
  const hasSalvePermission = hasPermission(user.role, 'salve.access')
  const hasCustomSalveAccess = user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true

  if (!hasSalvePermission && !hasCustomSalveAccess) {
    console.error(`[SALVE] ❌ User ${user.email} (role: ${user.role}) lacks salve.access permission`)
    throw new Error('Access denied - SALVE portal access required')
  }

  // Verify the event belongs to the user's organization (unless master_admin)
  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    })

    if (!event) {
      throw new Error('Access denied to this event')
    }
  }

  return user
}

// GET: Fetch packet settings for an event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params
    await requireSalveAccess(request, eventId)

    // Fetch event settings
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        settings: {
          select: {
            salvePacketSettings: true,
          },
        },
      },
    })

    // Return saved settings or defaults
    const settings = event?.settings?.salvePacketSettings || DEFAULT_PACKET_SETTINGS

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Error fetching packet settings:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch packet settings' },
      { status: 500 }
    )
  }
}

// PUT: Update packet settings for an event
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params
    await requireSalveAccess(request, eventId)

    const body = await request.json()
    const { settings } = body

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 })
    }

    // Update or create event settings with packet settings
    const updatedSettings = await prisma.eventSettings.upsert({
      where: { eventId },
      create: {
        eventId,
        salvePacketSettings: settings,
      },
      update: {
        salvePacketSettings: settings,
      },
      select: {
        salvePacketSettings: true,
      },
    })

    return NextResponse.json({
      success: true,
      settings: updatedSettings.salvePacketSettings
    })
  } catch (error: any) {
    console.error('Error updating packet settings:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to update packet settings' },
      { status: 500 }
    )
  }
}
