import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

type CheckInMode = 'group' | 'individual'

// Roles allowed to change how check-in works (check-in staff can only use it)
const SETTINGS_EDITOR_ROLES = ['master_admin', 'org_admin', 'event_manager', 'salve_coordinator']

// Helper function to check if user can access Salve portal
async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = await getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)

  if (!user) {
    throw new Error('Unauthorized')
  }

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

function errorResponse(error: any, fallback: string) {
  if (error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (error.message?.includes('Access denied')) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}

async function loadSettings(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      name: true,
      settings: {
        select: {
          groupRegistrationEnabled: true,
          salveCheckinMode: true,
        },
      },
    },
  })

  const groupRegistrationEnabled = event?.settings?.groupRegistrationEnabled ?? true
  // Individual mode only means something for group registrations
  const checkInMode: CheckInMode =
    groupRegistrationEnabled && event?.settings?.salveCheckinMode === 'individual' ? 'individual' : 'group'

  return {
    eventName: event?.name ?? 'Event',
    groupRegistrationEnabled,
    checkInMode,
  }
}

// GET: SALVE settings needed by the check-in portal and the SALVE admin page.
// Readable by anyone with SALVE access (including check-in-only staff, who
// can't read the full admin event endpoint).
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params
    const user = await requireSalveAccess(request, eventId)

    return NextResponse.json({
      ...(await loadSettings(eventId)),
      canEdit: SETTINGS_EDITOR_ROLES.includes(user.role),
    })
  } catch (error: any) {
    console.error('Error fetching SALVE settings:', error)
    return errorResponse(error, 'Failed to fetch SALVE settings')
  }
}

// PUT: Update SALVE settings. Org admins, event managers and SALVE
// coordinators only; check-in staff can use the portal but not change how it works.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params
    const user = await requireSalveAccess(request, eventId)

    if (!SETTINGS_EDITOR_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins and SALVE coordinators can change SALVE settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { checkInMode } = body

    if (checkInMode !== 'group' && checkInMode !== 'individual') {
      return NextResponse.json({ error: "checkInMode must be 'group' or 'individual'" }, { status: 400 })
    }

    const current = await loadSettings(eventId)
    if (checkInMode === 'individual' && !current.groupRegistrationEnabled) {
      return NextResponse.json(
        { error: 'Individual check-in mode is only available for events with group registration' },
        { status: 400 }
      )
    }

    await prisma.eventSettings.upsert({
      where: { eventId },
      create: { eventId, salveCheckinMode: checkInMode },
      update: { salveCheckinMode: checkInMode },
    })

    return NextResponse.json({ success: true, ...(await loadSettings(eventId)) })
  } catch (error: any) {
    console.error('Error updating SALVE settings:', error)
    return errorResponse(error, 'Failed to update SALVE settings')
  }
}
