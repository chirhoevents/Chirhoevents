import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orgId, eventId } = await params
    const body = await request.json()
    const { isPublished } = body

    if (typeof isPublished !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid isPublished value' },
        { status: 400 }
      )
    }

    // Verify event belongs to the specified organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: orgId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Update event isPublished status
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { isPublished },
    })

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    })
  } catch (error) {
    console.error('Error updating event publish status:', error)
    return NextResponse.json(
      { error: 'Failed to update event publish status' },
      { status: 500 }
    )
  }
}
