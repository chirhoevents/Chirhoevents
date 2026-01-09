import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - Get a single resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; resourceId: string }> }
) {
  try {
    const { eventId, resourceId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Resource]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Poros Resource] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const resource = await prisma.porosResource.findUnique({
      where: { id: resourceId }
    })

    if (!resource || resource.eventId !== eventId) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Failed to fetch resource:', error)
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 })
  }
}

// PUT - Update a resource
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; resourceId: string }> }
) {
  try {
    const { eventId, resourceId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Poros Resource]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Poros Resource] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, type, url, order, isActive } = body

    const resource = await prisma.porosResource.update({
      where: { id: resourceId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(url !== undefined && { url }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Failed to update resource:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
}

// DELETE - Delete a resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; resourceId: string }> }
) {
  try {
    const { eventId, resourceId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Resource]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Poros Resource] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosResource.delete({
      where: { id: resourceId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete resource:', error)
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }
}
