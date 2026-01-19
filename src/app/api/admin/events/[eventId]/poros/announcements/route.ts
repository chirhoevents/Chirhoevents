import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - List all announcements for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Announcements]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Poros Announcements] User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    let announcements: any[] = []
    try {
      announcements = await prisma.porosAnnouncement.findMany({
        where: { eventId },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
      })
    } catch (error) {
      // Table might not exist yet
      console.error('Announcements table might not exist:', error)
    }

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('Failed to fetch announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST - Create a new announcement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Announcements]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Poros Announcements] User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, message, type, startDate, endDate, isActive, order } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    // Get the max order for new announcements
    let maxOrderValue = 0
    try {
      const maxOrder = await prisma.porosAnnouncement.aggregate({
        where: { eventId },
        _max: { order: true }
      })
      maxOrderValue = maxOrder._max.order ?? 0
    } catch {
      // Table might not exist
    }

    const announcement = await prisma.porosAnnouncement.create({
      data: {
        eventId,
        title,
        message,
        type: type ?? 'info',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive ?? true,
        order: order ?? maxOrderValue + 1
      }
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Failed to create announcement:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

// PUT - Update multiple announcements (for reordering)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Poros Announcements]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Poros Announcements] User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { announcements } = body

    if (!Array.isArray(announcements)) {
      return NextResponse.json({ error: 'Announcements array required' }, { status: 400 })
    }

    // Update each announcement's order
    await Promise.all(
      announcements.map((a: { id: string; order: number }) =>
        prisma.porosAnnouncement.update({
          where: { id: a.id },
          data: { order: a.order }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update announcements:', error)
    return NextResponse.json({ error: 'Failed to update announcements' }, { status: 500 })
  }
}
