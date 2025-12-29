import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// List all support tickets (master admin)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const orgId = searchParams.get('orgId')

    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (orgId) {
      where.organizationId = orgId
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        submittedByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
        assignedToUser: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    // Get counts by status
    const counts = await prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    type CountType = typeof counts[0]

    const statusCounts = {
      all: tickets.length,
      open: 0,
      in_progress: 0,
      waiting_on_customer: 0,
      resolved: 0,
      closed: 0,
    }

    counts.forEach((c: CountType) => {
      statusCounts[c.status as keyof typeof statusCounts] = c._count.status
    })

    return NextResponse.json({ tickets, counts: statusCounts })
  } catch (error) {
    console.error('List tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
