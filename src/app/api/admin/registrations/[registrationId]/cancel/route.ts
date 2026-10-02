import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prismaIncludingCancelled as prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import {
  incrementOptionCapacity,
  incrementDayPassOptionCapacity,
  getGroupHousingCounts,
  type HousingType,
  type RoomType
} from '@/lib/option-capacity'
import {
  releaseRegistrationAssignments,
  deleteRegistrationPermanently,
} from '@/lib/registration-cleanup'

/**
 * Cancel/Delete a registration and restore capacity.
 * This properly handles:
 * 1. Restoring event capacityRemaining
 * 2. Restoring housing type capacities (on-campus, off-campus, day-pass)
 * 3. Restoring room type capacities (for individual registrations)
 * 4. Creating an audit trail
 * 5. Optionally deleting vs soft-deleting the registration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)
    const body = await request.json()
    const { type, reason, hardDelete = false } = body

    if (!type || !['group', 'individual'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid registration type. Must be "group" or "individual".' },
        { status: 400 }
      )
    }

    let registration: any = null
    let participantCount = 0
    let housingType: HousingType | null = null
    let roomType: RoomType | null = null
    let eventId: string = ''
    // A registration that's already cancelled has had its capacity given
    // back; re-cancelling (or hard-deleting it later) must not do it again.
    let restoreCapacity = true

    // Fetch the registration based on type
    if (type === 'group') {
      registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              capacityTotal: true,
              capacityRemaining: true,
            },
          },
        },
      })

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      if (!canAccessOrganization(user, registration.organizationId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (registration.cancelledAt && !hardDelete) {
        return NextResponse.json({ error: 'Registration is already cancelled' }, { status: 400 })
      }
      restoreCapacity = !registration.cancelledAt

      eventId = registration.eventId
      participantCount = registration.totalParticipants || 0
      housingType = registration.housingType

      // Restore housing option capacities (includes priests, matching what
      // registration took; legacy registrations fall back to housingType)
      const housingCounts = getGroupHousingCounts(registration)
      for (const pool of ['on_campus', 'off_campus', 'day_pass'] as const) {
        if (restoreCapacity && housingCounts[pool] > 0) {
          await incrementOptionCapacity(eventId, pool, null, housingCounts[pool])
        }
      }

      // Restore day pass option capacity (if applicable)
      if (restoreCapacity && registration.ticketType === 'day_pass' && registration.dayPassOptionId) {
        await incrementDayPassOptionCapacity(registration.dayPassOptionId, participantCount)
      }

    } else {
      // Individual registration
      registration = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              capacityTotal: true,
              capacityRemaining: true,
            },
          },
        },
      })

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      if (!canAccessOrganization(user, registration.organizationId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (registration.cancelledAt && !hardDelete) {
        return NextResponse.json({ error: 'Registration is already cancelled' }, { status: 400 })
      }
      restoreCapacity = !registration.cancelledAt

      eventId = registration.eventId
      participantCount = 1
      housingType = registration.housingType
      roomType = registration.roomType as RoomType | null

      // Restore housing option capacity (only for general admission)
      if (restoreCapacity && housingType && registration.ticketType !== 'day_pass') {
        await incrementOptionCapacity(eventId, housingType, roomType, 1)
      }

      // Restore day pass option capacity (if applicable)
      if (restoreCapacity && registration.ticketType === 'day_pass' && registration.dayPassOptionId) {
        await incrementDayPassOptionCapacity(registration.dayPassOptionId, 1)
      }
    }

    // Restore event-level capacity
    const event = registration.event
    if (restoreCapacity && event.capacityTotal !== null && event.capacityRemaining !== null) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          capacityRemaining: event.capacityRemaining + participantCount,
        },
      })
    }

    // Create audit trail
    await prisma.registrationEdit.create({
      data: {
        registrationId,
        registrationType: type,
        editedByUserId: user.id,
        editType: 'info_updated',
        changesMade: {
          action: hardDelete ? 'deleted' : 'cancelled',
          reason: reason || null,
          // Kept on the audit row so the master event report can still list
          // hard-deleted registrations once the registration row is gone.
          eventId,
          registrantName: type === 'group'
            ? registration.groupName
            : `${registration.firstName || ''} ${registration.lastName || ''}`.trim(),
          registrantEmail: type === 'group' ? registration.groupLeaderEmail : registration.email,
          participantsRestored: restoreCapacity ? participantCount : 0,
          housingType: housingType,
          ticketType: registration.ticketType || null,
          dayPassOptionId: registration.dayPassOptionId || null,
        },
        adminNotes: reason || 'Registration cancelled by admin',
      },
    })

    // Free beds / small group / meal / seating places either way.
    await releaseRegistrationAssignments(type, registrationId)

    // Delete or soft-delete based on preference
    if (hardDelete) {
      // Hard delete - remove from database. Use this rarely; the default
      // soft-cancel keeps payment / liability / participant history.
      await deleteRegistrationPermanently(type, registrationId)
    } else {
      // Soft cancel — mark the row as cancelled but keep all related data
      // (payments, liability forms, participants) intact for the org's
      // records. Filters on cancelledAt IS NULL exclude these from bulk
      // email, default registration lists, and reports.
      const cancelData = {
        cancelledAt: new Date(),
        cancelledByUserId: user.id,
        cancellationReason: reason || null,
      }
      if (type === 'group') {
        await prisma.groupRegistration.update({
          where: { id: registrationId },
          data: cancelData as any,
        })
      } else {
        await prisma.individualRegistration.update({
          where: { id: registrationId },
          data: cancelData as any,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Registration deleted successfully' : 'Registration cancelled successfully',
      capacityRestored: restoreCapacity ? participantCount : 0,
      event: {
        id: eventId,
        name: event.name,
        previousCapacityRemaining: event.capacityRemaining,
        newCapacityRemaining: (event.capacityRemaining || 0) + (restoreCapacity ? participantCount : 0),
      },
    })
  } catch (error) {
    console.error('Error cancelling registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
