import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - List all info items for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Info Items]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    let items: any[] = []
    try {
      items = await prisma.porosInfoItem.findMany({
        where: { eventId },
        orderBy: { order: 'asc' }
      })
    } catch (error) {
      console.error('Info items table might not exist:', error)
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch info items:', error)
    return NextResponse.json({ error: 'Failed to fetch info items' }, { status: 500 })
  }
}

// POST - Create a new info item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Info Items]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, type, url, isActive } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    let maxOrderValue = 0
    try {
      const maxOrder = await prisma.porosInfoItem.aggregate({
        where: { eventId },
        _max: { order: true }
      })
      maxOrderValue = maxOrder._max.order ?? 0
    } catch {
      // Table might not exist
    }

    const item = await prisma.porosInfoItem.create({
      data: {
        eventId,
        title,
        content,
        type: type || 'info',
        url: url || null,
        isActive: isActive ?? true,
        order: maxOrderValue + 1,
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Failed to create info item:', error)
    return NextResponse.json({ error: 'Failed to create info item' }, { status: 500 })
  }
}
