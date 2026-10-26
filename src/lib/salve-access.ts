import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { hasPermission } from '@/lib/permissions'

// Same check the other SALVE routes make: salve.access (role or custom
// permission) and, unless master admin, the event belongs to the user's org.
// Throws 'Unauthorized' or 'Access denied…' for the caller to map to 401/403.
export async function requireSalveAccess(request: NextRequest, eventId: string) {
  const overrideUserId = await getClerkUserIdFromHeader(request)
  const user = await getCurrentUser(overrideUserId)
  if (!user) throw new Error('Unauthorized')

  const allowed =
    hasPermission(user.role, 'salve.access') ||
    user.permissions?.['salve.access'] === true ||
    user.permissions?.['portals.salve.view'] === true
  if (!allowed) throw new Error('Access denied')

  if (user.role !== 'master_admin') {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: user.organizationId },
      select: { id: true },
    })
    if (!event) throw new Error('Access denied to this event')
  }

  return user
}

export function salveAccessErrorStatus(error: any): number | null {
  if (error?.message === 'Unauthorized') return 401
  if (typeof error?.message === 'string' && error.message.startsWith('Access denied')) return 403
  return null
}
