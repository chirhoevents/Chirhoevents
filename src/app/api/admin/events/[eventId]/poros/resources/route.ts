import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all resources for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resources = await prisma.porosResource.findMany({
      where: { eventId: params.eventId },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(resources)
  } catch (error) {
    console.error('Failed to fetch resources:', error)
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }
}

// POST - Create a new resource
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, url, order, isActive } = body

    if (!name || !type || !url) {
      return NextResponse.json(
        { error: 'Name, type, and URL are required' },
        { status: 400 }
      )
    }

    // Get the max order for new resources
    const maxOrder = await prisma.porosResource.aggregate({
      where: { eventId: params.eventId },
      _max: { order: true }
    })

    const resource = await prisma.porosResource.create({
      data: {
        eventId: params.eventId,
        name,
        type,
        url,
        order: order ?? (maxOrder._max.order ?? 0) + 1,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    console.error('Failed to create resource:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}

// PUT - Update multiple resources (for reordering)
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { resources } = body

    if (!Array.isArray(resources)) {
      return NextResponse.json({ error: 'Resources array required' }, { status: 400 })
    }

    // Update each resource's order
    await Promise.all(
      resources.map((r: { id: string; order: number }) =>
        prisma.porosResource.update({
          where: { id: r.id },
          data: { order: r.order }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update resources:', error)
    return NextResponse.json({ error: 'Failed to update resources' }, { status: 500 })
  }
}
