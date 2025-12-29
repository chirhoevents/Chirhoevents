import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Get single ticket with all messages (master admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { ticketId } = await params

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            subscriptionTier: true,
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        messages: {
          include: {
            user: {
              select: { firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// Update ticket (status, priority, assignee)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { ticketId } = await params
    const body = await request.json()
    const { status, priority, assignedToUserId } = body

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (status) {
      updateData.status = status
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date()
      }
    }

    if (priority) {
      updateData.priority = priority
    }

    if (assignedToUserId !== undefined) {
      updateData.assignedToUserId = assignedToUserId || null
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        organization: {
          select: { name: true },
        },
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: ticket.organizationId,
        userId: user.id,
        activityType: 'ticket_updated',
        description: `Ticket #${ticket.ticketNumber} updated: ${Object.keys(body).join(', ')}`,
      },
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
