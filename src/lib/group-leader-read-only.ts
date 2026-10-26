import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasEventEnded, EVENT_ENDED_PORTAL_MESSAGE } from '@/lib/event-ended'

/**
 * The group leader portal is read-only once the group's event is over.
 * Call this in group leader routes that change anything (paying a balance
 * excepted); it returns the 403 to send back, or null when the change is
 * allowed.
 */
export async function rejectIfGroupEventEnded(groupRegistrationId: string): Promise<NextResponse | null> {
  const registration = await prisma.groupRegistration.findUnique({
    where: { id: groupRegistrationId },
    select: { event: { select: { endDate: true, timezone: true, status: true, archivedAt: true } } },
  })
  if (registration && hasEventEnded(registration.event)) {
    return NextResponse.json({ error: EVENT_ENDED_PORTAL_MESSAGE, eventEnded: true }, { status: 403 })
  }
  return null
}
