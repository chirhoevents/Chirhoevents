import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// Get single ticket with all messages (master admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

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

    // Try to fetch with event relation, fall back without if migration not applied
    let ticket
    try {
      ticket = await prisma.supportTicket.findUnique({
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
          event: {
            select: { id: true, name: true, slug: true },
          },
          submittedByUser: {
            select: { firstName: true, lastName: true, email: true },
          },
          assignedToUser: {
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
    } catch (fetchError: unknown) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      if (errorMessage.includes('event') || errorMessage.includes('event_id')) {
        console.warn('Event field not in database yet, fetching ticket without it')
        ticket = await prisma.supportTicket.findUnique({
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
            submittedByUser: {
              select: { firstName: true, lastName: true, email: true },
            },
            assignedToUser: {
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
      } else {
        throw fetchError
      }
    }

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
    const clerkUserId = await getClerkUserIdFromRequest(request)

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
