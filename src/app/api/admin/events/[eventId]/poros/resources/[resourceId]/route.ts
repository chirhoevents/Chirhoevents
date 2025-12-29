import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get a single resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; resourceId: string }> }
) {
  try {
    const { eventId, resourceId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { resourceId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { resourceId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
