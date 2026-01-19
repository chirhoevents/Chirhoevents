import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// GET - Get a single announcement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; announcementId: string }> }
) {
  try {
    const { eventId, announcementId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Poros Announcement]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Poros Announcement] User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const announcement = await prisma.porosAnnouncement.findUnique({
      where: { id: announcementId }
    })

    if (!announcement || announcement.eventId !== eventId) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Failed to fetch announcement:', error)
    return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 })
  }
}

// PUT - Update an announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; announcementId: string }> }
) {
  try {
    const { eventId, announcementId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Poros Announcement]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Poros Announcement] User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, message, type, startDate, endDate, isActive, order } = body

    const announcement = await prisma.porosAnnouncement.update({
      where: { id: announcementId },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(type !== undefined && { type }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order })
      }
    })

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Failed to update announcement:', error)
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}

// DELETE - Delete an announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; announcementId: string }> }
) {
  try {
    const { eventId, announcementId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Announcement]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Poros Announcement] User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosAnnouncement.delete({
      where: { id: announcementId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete announcement:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
