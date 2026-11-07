import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { GROUP_NUMBER_MAX_LENGTH } from '@/lib/poros-group-directory'

async function authorize(request: NextRequest, eventId: string, logPrefix: string) {
  const { error, user } = await verifyEventAccess(request, eventId, {
    requireAdmin: true,
    logPrefix,
  })
  if (error) return error
  if (!hasPermission(user!.role, 'poros.access')) {
    return NextResponse.json(
      { message: 'Forbidden - Poros portal access required' },
      { status: 403 }
    )
  }
  return null
}

// GET /api/admin/events/[eventId]/poros/group-numbers
// Lists the event's active group registrations with their group number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const denied = await authorize(request, eventId, '[GET group-numbers]')
    if (denied) return denied

    const groups = await prisma.groupRegistration.findMany({
      where: { eventId, cancelledAt: null },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        groupLeaderName: true,
        groupCode: true,
        totalParticipants: true,
      },
      orderBy: { groupName: 'asc' },
    })

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('[GET group-numbers] Error:', error)
    return NextResponse.json({ message: 'Failed to load group numbers' }, { status: 500 })
  }
}

// PUT /api/admin/events/[eventId]/poros/group-numbers
// Body: { updates: [{ groupId, groupNumber }] } — groupNumber '' or null clears it.
// The same number may be given to more than one group (combined groups).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const denied = await authorize(request, eventId, '[PUT group-numbers]')
    if (denied) return denied

    const body = await request.json().catch(() => null)
    const updates = Array.isArray(body?.updates) ? body.updates : null
    if (!updates || updates.length === 0) {
      return NextResponse.json({ message: 'No changes to save' }, { status: 400 })
    }

    const cleaned: { groupId: string; groupNumber: string | null }[] = []
    for (const u of updates) {
      if (!u || typeof u.groupId !== 'string') {
        return NextResponse.json({ message: 'Invalid update' }, { status: 400 })
      }
      const raw = u.groupNumber == null ? '' : String(u.groupNumber).trim()
      if (raw.length > GROUP_NUMBER_MAX_LENGTH) {
        return NextResponse.json(
          { message: `Group numbers can be at most ${GROUP_NUMBER_MAX_LENGTH} characters ("${raw}")` },
          { status: 400 }
        )
      }
      cleaned.push({ groupId: u.groupId, groupNumber: raw || null })
    }

    // Only touch groups that belong to this event
    const ids = cleaned.map(u => u.groupId)
    const owned = await prisma.groupRegistration.findMany({
      where: { id: { in: ids }, eventId },
      select: { id: true },
    })
    if (owned.length !== new Set(ids).size) {
      return NextResponse.json({ message: 'One or more groups were not found for this event' }, { status: 404 })
    }

    await prisma.$transaction(
      cleaned.map(u =>
        prisma.groupRegistration.update({
          where: { id: u.groupId },
          data: { groupCode: u.groupNumber },
        })
      )
    )

    return NextResponse.json({ updated: cleaned.length })
  } catch (error) {
    console.error('[PUT group-numbers] Error:', error)
    return NextResponse.json({ message: 'Failed to save group numbers' }, { status: 500 })
  }
}
