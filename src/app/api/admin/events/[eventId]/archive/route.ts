import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccessWithPermission } from '@/lib/api-auth'

/**
 * POST   /api/admin/events/[eventId]/archive  — archive the event
 * DELETE /api/admin/events/[eventId]/archive  — restore it
 *
 * Archiving only sets events.archived_at. No registration, payment or form
 * data is touched; the event simply drops out of the org's dashboards,
 * lists and public pages and is viewed from the Archived Events page.
 */
async function setArchived(request: NextRequest, eventId: string, archive: boolean) {
  const { error } = await verifyEventAccessWithPermission(request, eventId, 'events.edit', {
    friendlyName: 'Archive events',
    logPrefix: archive ? '[Archive Event]' : '[Unarchive Event]',
  })
  if (error) return error

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { archivedAt: archive ? new Date() : null },
    select: { id: true, name: true, archivedAt: true },
  })

  return NextResponse.json({ event })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    return await setArchived(request, eventId, true)
  } catch (error) {
    console.error('[Archive Event] failed:', error)
    return NextResponse.json({ error: 'Failed to archive event' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    return await setArchived(request, eventId, false)
  } catch (error) {
    console.error('[Unarchive Event] failed:', error)
    return NextResponse.json({ error: 'Failed to restore event' }, { status: 500 })
  }
}
