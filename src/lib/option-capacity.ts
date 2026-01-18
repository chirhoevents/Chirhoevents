import { prisma } from '@/lib/prisma'

export type HousingType = 'on_campus' | 'off_campus' | 'day_pass'
export type RoomType = 'single' | 'double' | 'triple' | 'quad'

interface OptionCapacityResult {
  hasCapacity: boolean
  error?: string
  housingRemaining?: number
  roomRemaining?: number
}

interface EventSettings {
  onCampusCapacity: number | null
  onCampusRemaining: number | null
  offCampusCapacity: number | null
  offCampusRemaining: number | null
  dayPassCapacity: number | null
  dayPassRemaining: number | null
  singleRoomCapacity: number | null
  singleRoomRemaining: number | null
  doubleRoomCapacity: number | null
  doubleRoomRemaining: number | null
  tripleRoomCapacity: number | null
  tripleRoomRemaining: number | null
  quadRoomCapacity: number | null
  quadRoomRemaining: number | null
}

/**
 * Check if there's enough capacity for a given housing type and optionally room type
 */
export function checkOptionCapacity(
  settings: EventSettings | null,
  housingType: HousingType,
  roomType: RoomType | null,
  partySize: number = 1
): OptionCapacityResult {
  if (!settings) {
    // No settings means no option capacity limits - allow registration
    return { hasCapacity: true }
  }

  // Check housing type capacity
  let housingRemaining: number | null = null
  let housingCapacitySet = false

  if (housingType === 'on_campus') {
    housingCapacitySet = settings.onCampusCapacity !== null
    housingRemaining = settings.onCampusRemaining
  } else if (housingType === 'off_campus') {
    housingCapacitySet = settings.offCampusCapacity !== null
    housingRemaining = settings.offCampusRemaining
  } else if (housingType === 'day_pass') {
    housingCapacitySet = settings.dayPassCapacity !== null
    housingRemaining = settings.dayPassRemaining
  }

  // Only check housing capacity if it's been set
  if (housingCapacitySet && housingRemaining !== null) {
    if (housingRemaining <= 0) {
      return {
        hasCapacity: false,
        error: `No ${housingType.replace('_', ' ')} spots available. Please join the waitlist or select a different housing option.`,
        housingRemaining: 0,
      }
    }
    if (housingRemaining < partySize) {
      return {
        hasCapacity: false,
        error: `Only ${housingRemaining} ${housingType.replace('_', ' ')} spot${housingRemaining === 1 ? '' : 's'} remaining, but ${partySize} requested.`,
        housingRemaining,
      }
    }
  }

  // Check room type capacity (only for on_campus individual registrations)
  if (roomType && housingType === 'on_campus') {
    let roomRemaining: number | null = null
    let roomCapacitySet = false

    if (roomType === 'single') {
      roomCapacitySet = settings.singleRoomCapacity !== null
      roomRemaining = settings.singleRoomRemaining
    } else if (roomType === 'double') {
      roomCapacitySet = settings.doubleRoomCapacity !== null
      roomRemaining = settings.doubleRoomRemaining
    } else if (roomType === 'triple') {
      roomCapacitySet = settings.tripleRoomCapacity !== null
      roomRemaining = settings.tripleRoomRemaining
    } else if (roomType === 'quad') {
      roomCapacitySet = settings.quadRoomCapacity !== null
      roomRemaining = settings.quadRoomRemaining
    }

    // Only check room capacity if it's been set
    if (roomCapacitySet && roomRemaining !== null) {
      if (roomRemaining <= 0) {
        return {
          hasCapacity: false,
          error: `No ${roomType} room spots available. Please join the waitlist or select a different room type.`,
          housingRemaining: housingRemaining ?? undefined,
          roomRemaining: 0,
        }
      }
      if (roomRemaining < partySize) {
        return {
          hasCapacity: false,
          error: `Only ${roomRemaining} ${roomType} room spot${roomRemaining === 1 ? '' : 's'} remaining.`,
          housingRemaining: housingRemaining ?? undefined,
          roomRemaining,
        }
      }
    }

    return {
      hasCapacity: true,
      housingRemaining: housingRemaining ?? undefined,
      roomRemaining: roomRemaining ?? undefined,
    }
  }

  return {
    hasCapacity: true,
    housingRemaining: housingRemaining ?? undefined,
  }
}

/**
 * Decrement option capacity after a successful registration
 */
export async function decrementOptionCapacity(
  eventId: string,
  housingType: HousingType,
  roomType: RoomType | null,
  partySize: number = 1
): Promise<void> {
  // Build the update data dynamically based on which option was selected
  const updateData: Record<string, { decrement: number }> = {}

  // Decrement housing type capacity
  if (housingType === 'on_campus') {
    updateData.onCampusRemaining = { decrement: partySize }
  } else if (housingType === 'off_campus') {
    updateData.offCampusRemaining = { decrement: partySize }
  } else if (housingType === 'day_pass') {
    updateData.dayPassRemaining = { decrement: partySize }
  }

  // Decrement room type capacity (only for on_campus with room type)
  if (roomType && housingType === 'on_campus') {
    if (roomType === 'single') {
      updateData.singleRoomRemaining = { decrement: partySize }
    } else if (roomType === 'double') {
      updateData.doubleRoomRemaining = { decrement: partySize }
    } else if (roomType === 'triple') {
      updateData.tripleRoomRemaining = { decrement: partySize }
    } else if (roomType === 'quad') {
      updateData.quadRoomRemaining = { decrement: partySize }
    }
  }

  // Only update if there's something to update
  if (Object.keys(updateData).length > 0) {
    await prisma.eventSettings.update({
      where: { eventId },
      data: updateData,
    })
  }
}

/**
 * Increment option capacity (e.g., when a registration is cancelled)
 * This function caps the remaining value at the capacity to prevent invalid states.
 */
export async function incrementOptionCapacity(
  eventId: string,
  housingType: HousingType,
  roomType: RoomType | null,
  partySize: number = 1
): Promise<void> {
  // Fetch current settings to cap at capacity
  const settings = await prisma.eventSettings.findUnique({
    where: { eventId },
    select: {
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
  })

  if (!settings) return

  const updateData: Record<string, number> = {}

  // Helper to calculate capped remaining value
  const cappedIncrement = (
    currentRemaining: number | null,
    capacity: number | null,
    increment: number
  ): number | null => {
    if (capacity === null) return null // No capacity set, don't update
    const current = currentRemaining ?? 0
    return Math.min(current + increment, capacity)
  }

  // Handle housing type capacity
  if (housingType === 'on_campus' && settings.onCampusCapacity !== null) {
    const newValue = cappedIncrement(settings.onCampusRemaining, settings.onCampusCapacity, partySize)
    if (newValue !== null) updateData.onCampusRemaining = newValue
  } else if (housingType === 'off_campus' && settings.offCampusCapacity !== null) {
    const newValue = cappedIncrement(settings.offCampusRemaining, settings.offCampusCapacity, partySize)
    if (newValue !== null) updateData.offCampusRemaining = newValue
  } else if (housingType === 'day_pass' && settings.dayPassCapacity !== null) {
    const newValue = cappedIncrement(settings.dayPassRemaining, settings.dayPassCapacity, partySize)
    if (newValue !== null) updateData.dayPassRemaining = newValue
  }

  // Handle room type capacity
  if (roomType && housingType === 'on_campus') {
    if (roomType === 'single' && settings.singleRoomCapacity !== null) {
      const newValue = cappedIncrement(settings.singleRoomRemaining, settings.singleRoomCapacity, partySize)
      if (newValue !== null) updateData.singleRoomRemaining = newValue
    } else if (roomType === 'double' && settings.doubleRoomCapacity !== null) {
      const newValue = cappedIncrement(settings.doubleRoomRemaining, settings.doubleRoomCapacity, partySize)
      if (newValue !== null) updateData.doubleRoomRemaining = newValue
    } else if (roomType === 'triple' && settings.tripleRoomCapacity !== null) {
      const newValue = cappedIncrement(settings.tripleRoomRemaining, settings.tripleRoomCapacity, partySize)
      if (newValue !== null) updateData.tripleRoomRemaining = newValue
    } else if (roomType === 'quad' && settings.quadRoomCapacity !== null) {
      const newValue = cappedIncrement(settings.quadRoomRemaining, settings.quadRoomCapacity, partySize)
      if (newValue !== null) updateData.quadRoomRemaining = newValue
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.eventSettings.update({
      where: { eventId },
      data: updateData,
    })
  }
}

/**
 * Get available options based on current capacity
 * Returns which housing types and room types are still available
 */
export function getAvailableOptions(settings: EventSettings | null): {
  housingTypes: HousingType[]
  roomTypes: RoomType[]
} {
  const availableHousingTypes: HousingType[] = []
  const availableRoomTypes: RoomType[] = []

  if (!settings) {
    // No settings means all options available
    return {
      housingTypes: ['on_campus', 'off_campus', 'day_pass'],
      roomTypes: ['single', 'double', 'triple', 'quad'],
    }
  }

  // Check housing types
  if (settings.onCampusCapacity === null || (settings.onCampusRemaining ?? 0) > 0) {
    availableHousingTypes.push('on_campus')
  }
  if (settings.offCampusCapacity === null || (settings.offCampusRemaining ?? 0) > 0) {
    availableHousingTypes.push('off_campus')
  }
  if (settings.dayPassCapacity === null || (settings.dayPassRemaining ?? 0) > 0) {
    availableHousingTypes.push('day_pass')
  }

  // Check room types
  if (settings.singleRoomCapacity === null || (settings.singleRoomRemaining ?? 0) > 0) {
    availableRoomTypes.push('single')
  }
  if (settings.doubleRoomCapacity === null || (settings.doubleRoomRemaining ?? 0) > 0) {
    availableRoomTypes.push('double')
  }
  if (settings.tripleRoomCapacity === null || (settings.tripleRoomRemaining ?? 0) > 0) {
    availableRoomTypes.push('triple')
  }
  if (settings.quadRoomCapacity === null || (settings.quadRoomRemaining ?? 0) > 0) {
    availableRoomTypes.push('quad')
  }

  return { housingTypes: availableHousingTypes, roomTypes: availableRoomTypes }
}

// ===================================
// DAY PASS OPTION CAPACITY FUNCTIONS
// ===================================

interface DayPassOptionCapacityResult {
  hasCapacity: boolean
  error?: string
  remaining?: number
}

/**
 * Check if a specific day pass option has capacity
 */
export async function checkDayPassOptionCapacity(
  dayPassOptionId: string,
  partySize: number = 1
): Promise<DayPassOptionCapacityResult> {
  const option = await prisma.dayPassOption.findUnique({
    where: { id: dayPassOptionId },
    select: { name: true, capacity: true, remaining: true, isActive: true },
  })

  if (!option) {
    return {
      hasCapacity: false,
      error: 'Day pass option not found',
    }
  }

  if (!option.isActive) {
    return {
      hasCapacity: false,
      error: `${option.name} is no longer available`,
    }
  }

  // If capacity is 0, it means unlimited
  if (option.capacity === 0) {
    return { hasCapacity: true }
  }

  if (option.remaining <= 0) {
    return {
      hasCapacity: false,
      error: `No spots available for ${option.name}. Please select a different day pass option.`,
      remaining: 0,
    }
  }

  if (option.remaining < partySize) {
    return {
      hasCapacity: false,
      error: `Only ${option.remaining} spot${option.remaining === 1 ? '' : 's'} remaining for ${option.name}, but ${partySize} requested.`,
      remaining: option.remaining,
    }
  }

  return {
    hasCapacity: true,
    remaining: option.remaining,
  }
}

/**
 * Decrement day pass option capacity after a successful registration
 */
export async function decrementDayPassOptionCapacity(
  dayPassOptionId: string,
  partySize: number = 1
): Promise<void> {
  await prisma.dayPassOption.update({
    where: { id: dayPassOptionId },
    data: {
      remaining: { decrement: partySize },
    },
  })
}

/**
 * Increment day pass option capacity (e.g., when a registration is cancelled)
 */
export async function incrementDayPassOptionCapacity(
  dayPassOptionId: string,
  partySize: number = 1
): Promise<void> {
  // Get current capacity to ensure we don't exceed it
  const option = await prisma.dayPassOption.findUnique({
    where: { id: dayPassOptionId },
    select: { capacity: true, remaining: true },
  })

  if (!option) return

  // If capacity is 0 (unlimited), don't increment
  if (option.capacity === 0) return

  // Calculate new remaining, but cap at capacity
  const newRemaining = Math.min(option.remaining + partySize, option.capacity)

  await prisma.dayPassOption.update({
    where: { id: dayPassOptionId },
    data: {
      remaining: newRemaining,
    },
  })
}
