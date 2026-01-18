import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

/**
 * POST /api/master-admin/organizations/[orgId]/reset-usage
 *
 * Recalculates and resets the organization's usage counters (eventsUsed, registrationsUsed)
 * based on actual current data. This is useful when usage has drifted or when events/registrations
 * have been deleted and you want to reset the counters to reflect current state.
 *
 * Counts:
 * - Events: All non-draft events
 * - Registrations: All participants from active group registrations + individual registrations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const masterAdmin = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!masterAdmin || masterAdmin.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orgId } = await params

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        eventsUsed: true,
        registrationsUsed: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Count all non-draft events for this organization
    const eventsCount = await prisma.event.count({
      where: {
        organizationId: orgId,
        status: { not: 'draft' },
      },
    })

    // Count total participants from group registrations that are not incomplete
    // This counts actual people registered
    const groupParticipantsCount = await prisma.participant.count({
      where: {
        organizationId: orgId,
        groupRegistration: {
          registrationStatus: { not: 'incomplete' },
        },
      },
    })

    // Count individual registrations that are not incomplete
    const individualRegistrationsCount = await prisma.individualRegistration.count({
      where: {
        organizationId: orgId,
        registrationStatus: { not: 'incomplete' },
      },
    })

    const totalRegistrations = groupParticipantsCount + individualRegistrationsCount

    // Update the organization with recalculated values
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        eventsUsed: eventsCount,
        registrationsUsed: totalRegistrations,
      },
      select: {
        eventsUsed: true,
        registrationsUsed: true,
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: masterAdmin.id,
        activityType: 'usage_reset',
        description: `Usage reset for "${organization.name}": Events ${organization.eventsUsed} → ${eventsCount}, Registrations ${organization.registrationsUsed} → ${totalRegistrations}`,
      },
    })

    return NextResponse.json({
      success: true,
      previousUsage: {
        eventsUsed: organization.eventsUsed,
        registrationsUsed: organization.registrationsUsed,
      },
      currentUsage: {
        eventsUsed: updatedOrg.eventsUsed,
        registrationsUsed: updatedOrg.registrationsUsed,
      },
      breakdown: {
        events: eventsCount,
        groupParticipants: groupParticipantsCount,
        individualRegistrations: individualRegistrationsCount,
      },
    })
  } catch (error) {
    console.error('Reset usage error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to reset usage', details: errorMessage },
      { status: 500 }
    )
  }
}
