import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Get single ticket with messages (org admin - only their org's tickets)
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
      select: { id: true, organizationId: true },
    })

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { ticketId } = await params

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        organizationId: user.organizationId,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
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

// Add reply to ticket (org admin)
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
      select: { id: true, organizationId: true },
    })

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { ticketId } = await params
    const body = await request.json()
    const { message } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Verify ticket belongs to user's org
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        organizationId: user.organizationId,
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Add reply and update ticket status
    const [newMessage] = await prisma.$transaction([
      prisma.supportTicketMessage.create({
        data: {
          ticketId,
          userId: user.id,
          message: message.trim(),
          isFromAdmin: false,
        },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'open', // Reopen if was waiting on customer
          updatedAt: new Date(),
        },
      }),
    ])

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
