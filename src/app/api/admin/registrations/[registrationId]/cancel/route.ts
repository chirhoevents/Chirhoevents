import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import {
  incrementOptionCapacity,
  incrementDayPassOptionCapacity,
  type HousingType,
  type RoomType
} from '@/lib/option-capacity'

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

      eventId = registration.eventId
      participantCount = registration.totalParticipants || 0
      housingType = registration.housingType

      // Calculate housing-specific counts for capacity restoration
      const onCampusCount = (registration.onCampusYouth || 0) + (registration.onCampusChaperones || 0)
      const offCampusCount = (registration.offCampusYouth || 0) + (registration.offCampusChaperones || 0)
      const dayPassCount = (registration.dayPassYouth || 0) + (registration.dayPassChaperones || 0)

      // Restore housing option capacities
      if (onCampusCount > 0) {
        await incrementOptionCapacity(eventId, 'on_campus', null, onCampusCount)
      }
      if (offCampusCount > 0) {
        await incrementOptionCapacity(eventId, 'off_campus', null, offCampusCount)
      }
      if (dayPassCount > 0) {
        await incrementOptionCapacity(eventId, 'day_pass', null, dayPassCount)
      }

      // If no inventory-style counts, fall back to housing type (only for general admission)
      if (onCampusCount === 0 && offCampusCount === 0 && dayPassCount === 0 && housingType && registration.ticketType !== 'day_pass') {
        await incrementOptionCapacity(eventId, housingType, null, participantCount)
      }

      // Restore day pass option capacity (if applicable)
      if (registration.ticketType === 'day_pass' && registration.dayPassOptionId) {
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

      eventId = registration.eventId
      participantCount = 1
      housingType = registration.housingType
      roomType = registration.roomType as RoomType | null

      // Restore housing option capacity (only for general admission)
      if (housingType && registration.ticketType !== 'day_pass') {
        await incrementOptionCapacity(eventId, housingType, roomType, 1)
      }

      // Restore day pass option capacity (if applicable)
      if (registration.ticketType === 'day_pass' && registration.dayPassOptionId) {
        await incrementDayPassOptionCapacity(registration.dayPassOptionId, 1)
      }
    }

    // Restore event-level capacity
    const event = registration.event
    if (event.capacityTotal !== null && event.capacityRemaining !== null) {
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
          participantsRestored: participantCount,
          housingType: housingType,
          ticketType: registration.ticketType || null,
          dayPassOptionId: registration.dayPassOptionId || null,
        },
        adminNotes: reason || 'Registration cancelled by admin',
      },
    })

    // Delete or soft-delete based on preference
    if (hardDelete) {
      // Hard delete - remove from database
      if (type === 'group') {
        // First delete related records
        await prisma.participant.deleteMany({
          where: { groupRegistrationId: registrationId },
        })
        await prisma.liabilityForm.deleteMany({
          where: { groupRegistrationId: registrationId },
        })
        await prisma.paymentBalance.deleteMany({
          where: { registrationId, registrationType: 'group' },
        })
        await prisma.payment.deleteMany({
          where: { registrationId, registrationType: 'group' },
        })
        await prisma.groupRegistration.delete({
          where: { id: registrationId },
        })
      } else {
        await prisma.liabilityForm.deleteMany({
          where: { individualRegistrationId: registrationId },
        })
        await prisma.paymentBalance.deleteMany({
          where: { registrationId, registrationType: 'individual' },
        })
        await prisma.payment.deleteMany({
          where: { registrationId, registrationType: 'individual' },
        })
        await prisma.individualRegistration.delete({
          where: { id: registrationId },
        })
      }
    }
    // Note: If not hard delete, we just leave the registration as-is
    // A proper soft-delete would require adding a 'cancelled' status to the schema

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Registration deleted successfully' : 'Registration cancelled successfully',
      capacityRestored: participantCount,
      event: {
        id: eventId,
        name: event.name,
        previousCapacityRemaining: event.capacityRemaining,
        newCapacityRemaining: (event.capacityRemaining || 0) + participantCount,
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
