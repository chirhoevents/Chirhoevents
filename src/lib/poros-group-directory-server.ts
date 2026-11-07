import { prisma } from '@/lib/prisma'
import type { DirectoryGroup } from '@/lib/poros-group-directory'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function fullName(p: { firstName: string; lastName: string } | null | undefined): string | null {
  if (!p) return null
  return `${p.firstName} ${p.lastName}`.trim() || null
}

function roomLabel(room: { roomNumber: string; building: { name: string } }): string {
  return `${room.building.name} ${room.roomNumber}`
}

function pushUnique(list: string[], value: string | null) {
  if (value && !list.includes(value)) list.push(value)
}

/**
 * Everything the public group directory shows, built from the event's live
 * Poros data. Deliberately leaves out phone numbers, emails, special
 * requests and ADA notes — the public portal has no login.
 */
export async function fetchGroupDirectory(eventId: string): Promise<DirectoryGroup[]> {
  const [groups, mealAssignments, roomAssignments, smallGroupAssignments] = await Promise.all([
    prisma.groupRegistration.findMany({
      where: { eventId, cancelledAt: null },
      select: {
        id: true,
        groupName: true,
        parishName: true,
        groupCode: true,
        groupLeaderName: true,
        totalParticipants: true,
        housingType: true,
        ticketType: true,
        smallGroupRoom: { select: { roomNumber: true, building: { select: { name: true } } } },
        groupStaffAssignments: {
          select: { role: true, staff: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.mealGroupAssignment.findMany({
      where: { groupRegistrationId: { not: null }, mealGroup: { eventId, isActive: true } },
      select: {
        groupRegistrationId: true,
        mealGroup: {
          select: {
            name: true,
            colorHex: true,
            breakfastTime: true,
            lunchTime: true,
            dinnerTime: true,
            sundayBreakfastTime: true,
          },
        },
      },
    }),
    prisma.roomAssignment.findMany({
      where: { groupRegistrationId: { not: null }, room: { building: { eventId } } },
      select: {
        groupRegistrationId: true,
        room: { select: { roomNumber: true, gender: true, building: { select: { name: true } } } },
      },
    }),
    prisma.smallGroupAssignment.findMany({
      where: { groupRegistrationId: { not: null }, smallGroup: { eventId } },
      select: {
        groupRegistrationId: true,
        smallGroup: {
          select: {
            meetingPlace: true,
            meetingRoom: { select: { roomNumber: true, building: { select: { name: true } } } },
            sgl: { select: { firstName: true, lastName: true } },
            coSgl: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  const mealByGroup = new Map<string, (typeof mealAssignments)[number]['mealGroup']>()
  for (const a of mealAssignments) {
    if (a.groupRegistrationId && !mealByGroup.has(a.groupRegistrationId)) {
      mealByGroup.set(a.groupRegistrationId, a.mealGroup)
    }
  }

  const roomsByGroup = new Map<string, (typeof roomAssignments)[number]['room'][]>()
  for (const a of roomAssignments) {
    if (!a.groupRegistrationId) continue
    const list = roomsByGroup.get(a.groupRegistrationId) || []
    list.push(a.room)
    roomsByGroup.set(a.groupRegistrationId, list)
  }

  const smallGroupByGroup = new Map<string, (typeof smallGroupAssignments)[number]['smallGroup']>()
  for (const a of smallGroupAssignments) {
    if (a.groupRegistrationId && !smallGroupByGroup.has(a.groupRegistrationId)) {
      smallGroupByGroup.set(a.groupRegistrationId, a.smallGroup)
    }
  }

  const directory: DirectoryGroup[] = groups.map(g => {
    // Staff: direct per-group assignments, falling back to the older small-group model
    const sgl: string[] = []
    const religious: string[] = []
    for (const a of g.groupStaffAssignments) {
      if (a.role === 'sgl') pushUnique(sgl, fullName(a.staff))
      else if (a.role === 'religious') pushUnique(religious, fullName(a.staff))
    }
    const legacySmallGroup = smallGroupByGroup.get(g.id)
    if (sgl.length === 0) pushUnique(sgl, fullName(legacySmallGroup?.sgl))
    if (religious.length === 0) pushUnique(religious, fullName(legacySmallGroup?.coSgl))

    const smallGroupRoom = g.smallGroupRoom
      ? roomLabel(g.smallGroupRoom)
      : legacySmallGroup?.meetingRoom
        ? roomLabel(legacySmallGroup.meetingRoom)
        : legacySmallGroup?.meetingPlace || null

    const maleRooms: string[] = []
    const femaleRooms: string[] = []
    const otherRooms: string[] = []
    for (const room of roomsByGroup.get(g.id) || []) {
      const label = roomLabel(room)
      if (room.gender === 'male') pushUnique(maleRooms, label)
      else if (room.gender === 'female') pushUnique(femaleRooms, label)
      else pushUnique(otherRooms, label)
    }
    for (const list of [maleRooms, femaleRooms, otherRooms]) list.sort(collator.compare)

    const meal = mealByGroup.get(g.id)

    return {
      id: g.id,
      groupNumber: g.groupCode?.trim() || null,
      name: g.parishName?.trim() || g.groupName,
      leader: g.groupLeaderName,
      people: g.totalParticipants,
      offCampus: g.housingType === 'off_campus',
      dayPass: g.ticketType === 'day_pass' || g.housingType === 'day_pass',
      meal: meal
        ? {
            name: meal.name,
            colorHex: meal.colorHex || null,
            breakfast: meal.breakfastTime || null,
            lunch: meal.lunchTime || null,
            dinner: meal.dinnerTime || null,
            sundayBreakfast: meal.sundayBreakfastTime || null,
          }
        : null,
      sgl,
      religious,
      smallGroupRoom,
      maleRooms,
      femaleRooms,
      otherRooms,
    }
  })

  // Numbered groups first in number order (so combined groups sit together), then the rest by name
  return directory.sort((a, b) => {
    if (a.groupNumber && !b.groupNumber) return -1
    if (!a.groupNumber && b.groupNumber) return 1
    if (a.groupNumber && b.groupNumber) {
      const byNumber = collator.compare(a.groupNumber, b.groupNumber)
      if (byNumber !== 0) return byNumber
    }
    return collator.compare(a.name, b.name)
  })
}
