import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

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

    const updateData: any = {}
    if (day !== undefined) updateData.day = day
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime || null
    if (location !== undefined) updateData.location = location
    if (description !== undefined) updateData.description = description || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    const confession = await prisma.porosConfession.update({
      where: { id: confessionId },
      data: updateData,
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

    await prisma.porosConfession.delete({
      where: { id: confessionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession:', error)
    return NextResponse.json({ error: 'Failed to delete confession' }, { status: 500 })
  }
}
