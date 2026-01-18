import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

/**
 * POST /api/master-admin/organizations/[orgId]/reset-usage
 *
 * Recalculates and resets the organization's usage counters (eventsUsed, registrationsUsed)
 * based on actual current data. This is useful when usage has drifted or when events/registrations
 * have been deleted and you want to reset the counters to reflect current state.
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
        subscriptionStartedAt: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Calculate the start of the current subscription year
    // If subscriptionStartedAt exists, use that as the basis; otherwise use current calendar year
    let yearStart: Date
    if (organization.subscriptionStartedAt) {
      const subStart = new Date(organization.subscriptionStartedAt)
      const now = new Date()
      // Calculate how many years have passed since subscription started
      const yearsSinceStart = Math.floor(
        (now.getTime() - subStart.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      // Current subscription year starts on the anniversary
      yearStart = new Date(subStart)
      yearStart.setFullYear(subStart.getFullYear() + yearsSinceStart)
    } else {
      // Fall back to calendar year
      yearStart = new Date(new Date().getFullYear(), 0, 1)
    }

    // Count events created since the start of the current subscription year
    // Only count events that are not in draft status
    const eventsCount = await prisma.event.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: yearStart },
        status: { not: 'draft' },
      },
    })

    // Count total participants from group registrations (not cancelled)
    // We count participants rather than group registrations since that's what's tracked
    const groupParticipantsCount = await prisma.participant.count({
      where: {
        organizationId: orgId,
        groupRegistration: {
          createdAt: { gte: yearStart },
          registrationStatus: { not: 'incomplete' },
        },
      },
    })

    // Count individual registrations (not incomplete/cancelled)
    const individualRegistrationsCount = await prisma.individualRegistration.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: yearStart },
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
        yearStart: yearStart.toISOString(),
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
