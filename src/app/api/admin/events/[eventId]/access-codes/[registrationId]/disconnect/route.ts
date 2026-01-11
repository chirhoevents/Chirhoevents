import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEventAccess } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  const logPrefix = '[POST /api/admin/events/[eventId]/access-codes/[registrationId]/disconnect]'

  try {
    const { eventId, registrationId } = await params

    // Verify event access
    const { error, user, effectiveOrgId } = await verifyEventAccess(
      request,
      eventId,
      { logPrefix }
    )
    if (error || !user || !effectiveOrgId) {
      return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the group registration
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        accessCode: true,
        groupName: true,
        eventId: true,
        organizationId: true,
        clerkUserId: true,
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Verify registration belongs to this event
    if (registration.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Registration does not belong to this event' },
        { status: 400 }
      )
    }

    // Verify organization access
    if (registration.organizationId !== effectiveOrgId && user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this registration' },
        { status: 403 }
      )
    }

    // Check if already unlinked
    if (!registration.clerkUserId) {
      return NextResponse.json(
        { error: 'This access code is not linked to any account' },
        { status: 400 }
      )
    }

    // Disconnect the account
    await prisma.groupRegistration.update({
      where: { id: registrationId },
      data: {
        clerkUserId: null,
        dashboardLastAccessedAt: null,
      },
    })

    console.log(
      `${logPrefix} Disconnected account from access code ${registration.accessCode} (${registration.groupName}) by ${user.email}`
    )

    return NextResponse.json({
      success: true,
      message: `Account disconnected from access code ${registration.accessCode}`,
    })
  } catch (error) {
    console.error(`${logPrefix} Error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
