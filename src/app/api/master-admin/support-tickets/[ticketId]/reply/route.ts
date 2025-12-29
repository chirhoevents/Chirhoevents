import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Add admin reply to ticket
export async function POST(
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
      select: { id: true, role: true, firstName: true, lastName: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { ticketId } = await params
    const body = await request.json()
    const { message, newStatus } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, organizationId: true, ticketNumber: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Add reply and optionally update status
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (newStatus) {
      updateData.status = newStatus
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolvedAt = new Date()
      }
    } else {
      // Default to waiting_on_customer when admin replies
      updateData.status = 'waiting_on_customer'
    }

    // Assign to self if not assigned
    updateData.assignedToUserId = user.id

    const [newMessage] = await prisma.$transaction([
      prisma.supportTicketMessage.create({
        data: {
          ticketId,
          userId: user.id,
          message: message.trim(),
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
      }),
    ])

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: ticket.organizationId,
        userId: user.id,
        activityType: 'ticket_reply',
        description: `Replied to ticket #${ticket.ticketNumber}`,
      },
    })

    // TODO: Send email notification to org admin

    return NextResponse.json({
      success: true,
      message: newMessage,
    })
  } catch (error) {
    console.error('Reply to ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    )
  }
}
