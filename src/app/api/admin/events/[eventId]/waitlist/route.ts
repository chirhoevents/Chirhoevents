import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Check admin access
    const user = await getCurrentUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const { eventId } = await params

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized - Event belongs to different organization' },
        { status: 403 }
      )
    }

    // Fetch waitlist entries
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        eventId,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
      },
      entries: entries.map((entry: any, index: number) => ({
        id: entry.id,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        partySize: entry.partySize,
        notes: entry.notes,
        status: entry.status,
        position: index + 1,
        notifiedAt: entry.notifiedAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      summary: {
        total: entries.length,
        pending: entries.filter((e: any) => e.status === 'pending').length,
        contacted: entries.filter((e: any) => e.status === 'contacted').length,
        registered: entries.filter((e: any) => e.status === 'registered').length,
        expired: entries.filter((e: any) => e.status === 'expired').length,
      },
    })
  } catch (error) {
    console.error('Error fetching waitlist entries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
