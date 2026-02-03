import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// PATCH - Update an info item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> }
) {
  try {
    const { eventId, itemId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PATCH Poros Info Item]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, type, url, isActive, order } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (url !== undefined) updateData.url = url || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    const item = await prisma.porosInfoItem.update({
      where: { id: itemId },
      data: updateData,
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update info item:', error)
    return NextResponse.json({ error: 'Failed to update info item' }, { status: 500 })
  }
}

// DELETE - Delete an info item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> }
) {
  try {
    const { eventId, itemId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Info Item]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosInfoItem.delete({
      where: { id: itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete info item:', error)
    return NextResponse.json({ error: 'Failed to delete info item' }, { status: 500 })
  }
}
