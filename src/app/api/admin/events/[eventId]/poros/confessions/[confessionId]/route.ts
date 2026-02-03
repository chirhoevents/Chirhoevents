import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { updateConfession, deleteConfession } from '@/lib/poros-raw-queries'

// PATCH - Update a confession time slot
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; confessionId: string }> }
) {
  try {
    const { eventId, confessionId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PATCH Poros Confession]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, startTime, endTime, location, description, isActive, order } = body

    const confession = await updateConfession(confessionId, {
      day,
      startTime,
      endTime: endTime !== undefined ? (endTime || null) : undefined,
      location,
      description: description !== undefined ? (description || null) : undefined,
      isActive,
      order,
    })

    return NextResponse.json(confession)
  } catch (error) {
    console.error('Failed to update confession:', error)
    return NextResponse.json({ error: 'Failed to update confession' }, { status: 500 })
  }
}

// DELETE - Delete a confession time slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; confessionId: string }> }
) {
  try {
    const { eventId, confessionId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Confession]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await deleteConfession(confessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession:', error)
    return NextResponse.json({ error: 'Failed to delete confession' }, { status: 500 })
  }
}
