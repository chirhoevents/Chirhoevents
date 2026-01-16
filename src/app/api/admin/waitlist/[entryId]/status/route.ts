import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    // Check admin access
    const user = await getCurrentUser(overrideUserId)
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { entryId } = await params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['pending', 'contacted', 'registered', 'expired']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, contacted, registered, expired' },
        { status: 400 }
      )
    }

    // Fetch waitlist entry with event
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Verify event belongs to user's organization
    if (!canAccessOrganization(user, entry.event.organizationId)) {
      return NextResponse.json(
        { error: 'Unauthorized - Entry belongs to different organization' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: any = { status }

    // Set notifiedAt if moving to contacted status
    if (status === 'contacted' && entry.status !== 'contacted') {
      updateData.notifiedAt = new Date()
    }

    // Clear notifiedAt if moving back to pending
    if (status === 'pending') {
      updateData.notifiedAt = null
    }

    // Update entry status
    const updatedEntry = await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `Waitlist entry status updated to ${status}`,
      entry: {
        id: updatedEntry.id,
        name: updatedEntry.name,
        email: updatedEntry.email,
        status: updatedEntry.status,
        notifiedAt: updatedEntry.notifiedAt,
      },
    })
  } catch (error) {
    console.error('Error updating waitlist entry status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
