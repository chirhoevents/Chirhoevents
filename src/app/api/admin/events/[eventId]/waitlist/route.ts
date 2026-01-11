import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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

    if (!canAccessOrganization(user, event.organizationId)) {
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

    // Calculate analytics
    const contactedEntries = entries.filter((e: any) => e.status === 'contacted' || e.status === 'registered' || e.status === 'expired')
    const registeredEntries = entries.filter((e: any) => e.status === 'registered')

    // Conversion rate: registered / (contacted + registered + expired) - people who received an invitation
    const totalInvited = contactedEntries.length
    const conversionRate = totalInvited > 0
      ? Math.round((registeredEntries.length / totalInvited) * 100)
      : 0

    // Average wait time: from createdAt to notifiedAt for entries that were contacted
    const entriesWithWaitTime = entries.filter((e: any) => e.notifiedAt && e.createdAt)
    let averageWaitTimeHours = 0
    let averageWaitTimeDays = 0

    if (entriesWithWaitTime.length > 0) {
      const totalWaitTimeMs = entriesWithWaitTime.reduce((sum: number, e: any) => {
        const waitTime = new Date(e.notifiedAt).getTime() - new Date(e.createdAt).getTime()
        return sum + waitTime
      }, 0)

      const avgMs = totalWaitTimeMs / entriesWithWaitTime.length
      averageWaitTimeHours = Math.round(avgMs / (1000 * 60 * 60))
      averageWaitTimeDays = Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10 // One decimal place
    }

    // Total spots converted (party sizes of registered entries)
    const spotsConverted = registeredEntries.reduce((sum: number, e: any) => sum + e.partySize, 0)

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
        invitationExpires: entry.invitationExpires,
        hasToken: !!entry.registrationToken,
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
      analytics: {
        conversionRate, // Percentage
        totalInvited,
        spotsConverted,
        averageWaitTime: {
          hours: averageWaitTimeHours,
          days: averageWaitTimeDays,
          sampleSize: entriesWithWaitTime.length,
        },
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
