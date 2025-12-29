import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Create a new support ticket (org admin)
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, organizationId: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'You must belong to an organization to submit tickets' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { subject, category, priority, message } = body

    if (!subject || !category || !message) {
      return NextResponse.json(
        { error: 'Subject, category, and message are required' },
        { status: 400 }
      )
    }

    // Create ticket with initial message
    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: user.organizationId,
        createdByUserId: user.id,
        subject: subject.trim(),
        category,
        priority: priority || 'medium',
        status: 'open',
        messages: {
          create: {
            userId: user.id,
            message: message.trim(),
            isFromAdmin: false,
          },
        },
      },
      include: {
        messages: true,
        organization: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
      },
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

// List my organization's tickets (org admin)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('List tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
