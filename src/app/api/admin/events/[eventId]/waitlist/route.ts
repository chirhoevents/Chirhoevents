import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { releaseWaitlistOptionReservation } from '@/lib/waitlist-utils'

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

    // Verify event belongs to user's organization + pull the settings that
    // the admin waitlist UI needs for edit / adjust-offer dialogs.
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        settings: {
          select: {
            groupRegistrationEnabled: true,
            individualRegistrationEnabled: true,
            onCampusCapacity: true,
            offCampusCapacity: true,
            dayPassCapacity: true,
            singleRoomCapacity: true,
            doubleRoomCapacity: true,
            tripleRoomCapacity: true,
            quadRoomCapacity: true,
          },
        },
        dayPassOptions: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
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

    // Lazy sweep: flip any 'contacted' entry whose invitationExpires has
    // passed to 'expired' and release the seats it was holding back to event
    // capacity and its option pool. Race-safe: only entries that actually flip
    // from 'contacted' count toward the release, so concurrent sweeps don't
    // double-count.
    const staleContacted = await prisma.waitlistEntry.findMany({
      where: {
        eventId,
        status: 'contacted',
        invitationExpires: { lt: new Date() },
      },
      select: {
        id: true,
        reservedSpots: true,
        reservedHousingType: true,
        reservedRoomType: true,
        reservedDayPassOptionId: true,
      },
    })

    if (staleContacted.length > 0) {
      let totalReleased = 0
      for (const stale of staleContacted) {
        const flipped = await prisma.$executeRaw`
          UPDATE waitlist_entries
          SET status = 'expired',
              reserved_spots = NULL,
              reserved_housing_type = NULL,
              reserved_room_type = NULL,
              reserved_day_pass_option_id = NULL
          WHERE id = ${stale.id}::uuid
            AND status = 'contacted'
        `
        if (flipped === 1) {
          totalReleased += stale.reservedSpots ?? 0
          await releaseWaitlistOptionReservation({
            eventId,
            reservedSpots: stale.reservedSpots,
            reservedHousingType: stale.reservedHousingType as any,
            reservedRoomType: stale.reservedRoomType as any,
            reservedDayPassOptionId: stale.reservedDayPassOptionId,
          })
        }
      }
      if (totalReleased > 0) {
        await prisma.event.update({
          where: { id: eventId },
          data: { capacityRemaining: { increment: totalReleased } },
        })
        console.log(
          `[Waitlist] Sweep expired ${staleContacted.length} contacted invite(s), released ${totalReleased} seat(s) for event ${eventId}`
        )
      }
    }

    // Fetch waitlist entries with day-pass option name so the admin table
    // can show the human-readable option instead of a UUID.
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        eventId,
      },
      include: {
        dayPassOption: { select: { name: true } },
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

    // Build the preferences payload the admin waitlist UI uses to render
    // edit / adjust-offer dialogs. Same shape logic as the public modal.
    const s = event.settings
    const housingOffered: Array<'on_campus' | 'off_campus' | 'day_pass'> = []
    if (s?.onCampusCapacity !== null && s?.onCampusCapacity !== undefined) housingOffered.push('on_campus')
    if (s?.offCampusCapacity !== null && s?.offCampusCapacity !== undefined) housingOffered.push('off_campus')
    if (s?.dayPassCapacity !== null && s?.dayPassCapacity !== undefined) housingOffered.push('day_pass')
    const roomsOffered: Array<'single' | 'double' | 'triple' | 'quad'> = []
    if (s?.singleRoomCapacity !== null && s?.singleRoomCapacity !== undefined) roomsOffered.push('single')
    if (s?.doubleRoomCapacity !== null && s?.doubleRoomCapacity !== undefined) roomsOffered.push('double')
    if (s?.tripleRoomCapacity !== null && s?.tripleRoomCapacity !== undefined) roomsOffered.push('triple')
    if (s?.quadRoomCapacity !== null && s?.quadRoomCapacity !== undefined) roomsOffered.push('quad')

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
      },
      preferences: {
        groupRegistrationEnabled: s?.groupRegistrationEnabled ?? true,
        individualRegistrationEnabled: s?.individualRegistrationEnabled ?? true,
        housingTypes: housingOffered,
        roomTypes: roomsOffered,
        dayPassOptions: event.dayPassOptions ?? [],
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
        registrationType: entry.registrationType,
        preferredHousingType: entry.preferredHousingType,
        preferredRoomType: entry.preferredRoomType,
        preferredTicketType: entry.preferredTicketType,
        preferredDayPassOptionId: entry.preferredDayPassOptionId,
        preferredDayPassOptionName: entry.dayPassOption?.name ?? null,
        youthCount: entry.youthCount,
        chaperoneCount: entry.chaperoneCount,
        priestCount: entry.priestCount,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      summary: {
        total: entries.length,
        pending: entries.filter((e: any) => e.status === 'pending').length,
        contacted: entries.filter((e: any) => e.status === 'contacted').length,
        registered: entries.filter((e: any) => e.status === 'registered').length,
        expired: entries.filter((e: any) => e.status === 'expired').length,
        // Breakdown by housing type preference
        byHousingType: {
          onCampus: entries.filter((e: any) => e.preferredHousingType === 'on_campus' && e.status === 'pending').length,
          offCampus: entries.filter((e: any) => e.preferredHousingType === 'off_campus' && e.status === 'pending').length,
          dayPass: entries.filter((e: any) => e.preferredHousingType === 'day_pass' && e.status === 'pending').length,
          unspecified: entries.filter((e: any) => !e.preferredHousingType && e.status === 'pending').length,
        },
        // Breakdown by registration type preference
        byRegistrationType: {
          group: entries.filter((e: any) => e.registrationType === 'group' && e.status === 'pending').length,
          individual: entries.filter((e: any) => e.registrationType === 'individual' && e.status === 'pending').length,
          unspecified: entries.filter((e: any) => !e.registrationType && e.status === 'pending').length,
        },
        // Breakdown by ticket type preference
        byTicketType: {
          generalAdmission: entries.filter((e: any) => e.preferredTicketType === 'general_admission' && e.status === 'pending').length,
          dayPass: entries.filter((e: any) => e.preferredTicketType === 'day_pass' && e.status === 'pending').length,
          unspecified: entries.filter((e: any) => !e.preferredTicketType && e.status === 'pending').length,
        },
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
