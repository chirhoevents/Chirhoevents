import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * Recalculate and sync event capacity based on actual registrations.
 * This fixes capacity drift that can occur when registrations are cancelled/deleted
 * without properly restoring the capacity.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify admin access
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Recalculate Capacity]',
    })

    if (error) {
      return error
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get the event with its current capacity settings
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        capacityTotal: true,
        capacityRemaining: true,
        settings: {
          select: {
            id: true,
            onCampusCapacity: true,
            onCampusRemaining: true,
            offCampusCapacity: true,
            offCampusRemaining: true,
            dayPassCapacity: true,
            dayPassRemaining: true,
            singleRoomCapacity: true,
            singleRoomRemaining: true,
            doubleRoomCapacity: true,
            doubleRoomRemaining: true,
            tripleRoomCapacity: true,
            tripleRoomRemaining: true,
            quadRoomCapacity: true,
            quadRoomRemaining: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Count actual registrations
    // Group registrations - count by party size and housing type
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: {
        eventId,
      },
      select: {
        partySize: true,
        totalParticipants: true,
        housingType: true,
        onCampusYouth: true,
        onCampusChaperones: true,
        offCampusYouth: true,
        offCampusChaperones: true,
        dayPassYouth: true,
        dayPassChaperones: true,
      },
    })

    // Individual registrations - count by housing type and room type
    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: {
        eventId,
      },
      select: {
        housingType: true,
        roomType: true,
      },
    })

    // Calculate totals
    let totalGroupParticipants = 0
    let onCampusCount = 0
    let offCampusCount = 0
    let dayPassCount = 0

    // Count group registration participants
    for (const reg of groupRegistrations) {
      // Use totalParticipants or partySize
      const count = reg.totalParticipants || reg.partySize || 0
      totalGroupParticipants += count

      // Count by housing type from inventory-style fields if available
      if (reg.onCampusYouth !== null || reg.onCampusChaperones !== null) {
        onCampusCount += (reg.onCampusYouth || 0) + (reg.onCampusChaperones || 0)
        offCampusCount += (reg.offCampusYouth || 0) + (reg.offCampusChaperones || 0)
        dayPassCount += (reg.dayPassYouth || 0) + (reg.dayPassChaperones || 0)
      } else {
        // Fall back to housing type field
        if (reg.housingType === 'on_campus') {
          onCampusCount += count
        } else if (reg.housingType === 'off_campus') {
          offCampusCount += count
        } else if (reg.housingType === 'day_pass') {
          dayPassCount += count
        }
      }
    }

    // Count individual registration participants
    const totalIndividualParticipants = individualRegistrations.length
    let singleRoomCount = 0
    let doubleRoomCount = 0
    let tripleRoomCount = 0
    let quadRoomCount = 0

    for (const reg of individualRegistrations) {
      if (reg.housingType === 'on_campus') {
        onCampusCount += 1
        // Count room types
        if (reg.roomType === 'single') singleRoomCount++
        else if (reg.roomType === 'double') doubleRoomCount++
        else if (reg.roomType === 'triple') tripleRoomCount++
        else if (reg.roomType === 'quad') quadRoomCount++
      } else if (reg.housingType === 'off_campus') {
        offCampusCount += 1
      } else if (reg.housingType === 'day_pass') {
        dayPassCount += 1
      }
    }

    const totalActualRegistrations = totalGroupParticipants + totalIndividualParticipants

    // Calculate what capacity remaining should be
    const oldCapacityRemaining = event.capacityRemaining
    const newCapacityRemaining = event.capacityTotal !== null
      ? Math.max(0, event.capacityTotal - totalActualRegistrations)
      : null

    // Update event capacity
    await prisma.event.update({
      where: { id: eventId },
      data: {
        capacityRemaining: newCapacityRemaining,
      },
    })

    // Update settings capacity if settings exist
    let settingsUpdates: Record<string, number | null> = {}
    if (event.settings) {
      if (event.settings.onCampusCapacity !== null) {
        settingsUpdates.onCampusRemaining = Math.max(0, event.settings.onCampusCapacity - onCampusCount)
      }
      if (event.settings.offCampusCapacity !== null) {
        settingsUpdates.offCampusRemaining = Math.max(0, event.settings.offCampusCapacity - offCampusCount)
      }
      if (event.settings.dayPassCapacity !== null) {
        settingsUpdates.dayPassRemaining = Math.max(0, event.settings.dayPassCapacity - dayPassCount)
      }
      if (event.settings.singleRoomCapacity !== null) {
        settingsUpdates.singleRoomRemaining = Math.max(0, event.settings.singleRoomCapacity - singleRoomCount)
      }
      if (event.settings.doubleRoomCapacity !== null) {
        settingsUpdates.doubleRoomRemaining = Math.max(0, event.settings.doubleRoomCapacity - doubleRoomCount)
      }
      if (event.settings.tripleRoomCapacity !== null) {
        settingsUpdates.tripleRoomRemaining = Math.max(0, event.settings.tripleRoomCapacity - tripleRoomCount)
      }
      if (event.settings.quadRoomCapacity !== null) {
        settingsUpdates.quadRoomRemaining = Math.max(0, event.settings.quadRoomCapacity - quadRoomCount)
      }

      if (Object.keys(settingsUpdates).length > 0) {
        await prisma.eventSettings.update({
          where: { id: event.settings.id },
          data: settingsUpdates,
        })
      }
    }

    console.log(`[Recalculate Capacity] Event ${event.name}: capacityRemaining ${oldCapacityRemaining} -> ${newCapacityRemaining}`)

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
      },
      before: {
        capacityTotal: event.capacityTotal,
        capacityRemaining: oldCapacityRemaining,
      },
      after: {
        capacityTotal: event.capacityTotal,
        capacityRemaining: newCapacityRemaining,
      },
      actualRegistrations: {
        groupParticipants: totalGroupParticipants,
        individualParticipants: totalIndividualParticipants,
        total: totalActualRegistrations,
      },
      housingBreakdown: {
        onCampus: onCampusCount,
        offCampus: offCampusCount,
        dayPass: dayPassCount,
      },
      roomBreakdown: {
        single: singleRoomCount,
        double: doubleRoomCount,
        triple: tripleRoomCount,
        quad: quadRoomCount,
      },
      settingsUpdated: Object.keys(settingsUpdates).length > 0,
    })
  } catch (error) {
    console.error('Error recalculating capacity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
