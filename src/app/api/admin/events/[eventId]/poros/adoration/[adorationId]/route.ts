import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { updateAdoration, deleteAdoration } from '@/lib/poros-raw-queries'

// PATCH - Update an adoration time slot
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; adorationId: string }> }
) {
  try {
    const { eventId, adorationId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PATCH Poros Adoration]',
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

    const adoration = await updateAdoration(adorationId, {
      day,
      startTime,
      endTime: endTime !== undefined ? (endTime || null) : undefined,
      location,
      description: description !== undefined ? (description || null) : undefined,
      isActive,
      order,
    })

    return NextResponse.json(adoration)
  } catch (error) {
    console.error('Failed to update adoration:', error)
    return NextResponse.json({ error: 'Failed to update adoration time' }, { status: 500 })
  }
}

// DELETE - Delete an adoration time slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; adorationId: string }> }
) {
  try {
    const { eventId, adorationId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Adoration]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await deleteAdoration(adorationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete adoration:', error)
    return NextResponse.json({ error: 'Failed to delete adoration time' }, { status: 500 })
  }
}
