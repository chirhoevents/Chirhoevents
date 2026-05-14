import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)
  if (!user) throw new Error('Unauthorized')

  const hasSalvePermission = hasPermission(user.role, 'salve.access')
  const hasCustomSalveAccess =
    user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true
  if (!hasSalvePermission && !hasCustomSalveAccess) {
    throw new Error('Access denied - SALVE portal access required')
  }

  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: user.organizationId },
    })
    if (!event) throw new Error('Access denied to this event')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    await requireSalveAccess(request, eventId)

    let schedule: any[] = []
    try {
      schedule = await prisma.porosScheduleEntry.findMany({
        where: { eventId },
        orderBy: [{ day: 'asc' }, { order: 'asc' }, { startTime: 'asc' }],
      })
    } catch {
      // Table may not exist yet; return empty
    }

    return NextResponse.json({ schedule })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    if (error.message?.startsWith('Access denied')) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }
    return NextResponse.json({ schedule: [] })
  }
}
