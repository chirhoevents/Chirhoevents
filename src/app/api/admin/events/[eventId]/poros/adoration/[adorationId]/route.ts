import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

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

    const updateData: any = {}
    if (day !== undefined) updateData.day = day
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime || null
    if (location !== undefined) updateData.location = location
    if (description !== undefined) updateData.description = description || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    const adoration = await prisma.porosAdoration.update({
      where: { id: adorationId },
      data: updateData,
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

    await prisma.porosAdoration.delete({
      where: { id: adorationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete adoration:', error)
    return NextResponse.json({ error: 'Failed to delete adoration time' }, { status: 500 })
  }
}
