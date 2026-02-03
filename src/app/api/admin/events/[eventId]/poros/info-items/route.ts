import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { getInfoItems, createInfoItem } from '@/lib/poros-raw-queries'

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
      items = await getInfoItems(eventId)
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

    const item = await createInfoItem({
      eventId,
      title,
      content,
      type: type || 'info',
      url: url || null,
      isActive: isActive ?? true,
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Failed to create info item:', error)
    return NextResponse.json({ error: 'Failed to create info item' }, { status: 500 })
  }
}
