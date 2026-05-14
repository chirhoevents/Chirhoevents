import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

function shiftDateByOneYear(date: Date | null | undefined): Date | null {
  if (!date) return null
  const shifted = new Date(date)
  shifted.setFullYear(shifted.getFullYear() + 1)
  return shifted
}

/**
 * POST /api/admin/events/[eventId]/copy-poros
 *
 * Copies POROS structural data from a source event to a target event.
 * The target event must already exist.
 *
 * Body: { targetEventId: string, ...copyFlags }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
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
    const { targetEventId, ...copyFlags } = body

    if (!targetEventId) {
      return NextResponse.json(
        { error: 'targetEventId is required' },
        { status: 400 }
      )
    }

    // Verify source event belongs to org
    const sourceEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizationId: true },
    })

    if (!sourceEvent) {
      return NextResponse.json({ error: 'Source event not found' }, { status: 404 })
    }

    if (sourceEvent.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify target event belongs to org
    const targetEvent = await prisma.event.findUnique({
      where: { id: targetEventId },
      select: { id: true, organizationId: true },
    })

    if (!targetEvent) {
      return NextResponse.json({ error: 'Target event not found' }, { status: 404 })
    }

    if (targetEvent.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sourceId = eventId

    // Fetch and copy each selected category
    if (copyFlags.copyBuildings) {
      const buildings = await prisma.building.findMany({
        where: { eventId: sourceId },
        include: { rooms: true },
      })

      for (const building of buildings) {
        const newBuilding = await prisma.building.create({
          data: {
            eventId: targetEventId,
            name: building.name,
            gender: building.gender,
            housingType: building.housingType,
            totalFloors: building.totalFloors,
            totalRooms: building.totalRooms,
            totalBeds: building.totalBeds,
            notes: building.notes,
            displayOrder: building.displayOrder,
          },
        })

        if (building.rooms.length > 0) {
          await prisma.room.createMany({
            data: building.rooms.map((room) => ({
              buildingId: newBuilding.id,
              roomNumber: room.roomNumber,
              floor: room.floor,
              bedCount: room.bedCount,
              roomType: room.roomType,
              gender: room.gender,
              housingType: room.housingType,
              capacity: room.capacity,
              currentOccupancy: 0,
              notes: room.notes,
              isAvailable: true,
              isAdaAccessible: room.isAdaAccessible,
              adaFeatures: room.adaFeatures,
              roomPurpose: room.roomPurpose,
              allocatedToGroupId: null,
            })),
          })
        }
      }
    }

    if (copyFlags.copySmallGroups) {
      const smallGroups = await prisma.smallGroup.findMany({
        where: { eventId: sourceId },
      })

      if (smallGroups.length > 0) {
        await prisma.smallGroup.createMany({
          data: smallGroups.map((sg) => ({
            eventId: targetEventId,
            name: sg.name,
            groupNumber: sg.groupNumber,
            sglId: null,
            coSglId: null,
            meetingRoomId: null,
            meetingTime: sg.meetingTime,
            meetingPlace: sg.meetingPlace,
            capacity: sg.capacity,
            currentSize: 0,
            notes: sg.notes,
          })),
        })
      }
    }

    if (copyFlags.copyMealGroups) {
      const mealGroups = await prisma.mealGroup.findMany({
        where: { eventId: sourceId },
      })

      if (mealGroups.length > 0) {
        await prisma.mealGroup.createMany({
          data: mealGroups.map((mg) => ({
            eventId: targetEventId,
            name: mg.name,
            color: mg.color,
            colorHex: mg.colorHex,
            accommodationType: mg.accommodationType,
            breakfastTime: mg.breakfastTime,
            lunchTime: mg.lunchTime,
            dinnerTime: mg.dinnerTime,
            sundayBreakfastTime: mg.sundayBreakfastTime,
            capacity: mg.capacity,
            currentSize: 0,
            displayOrder: mg.displayOrder,
            isActive: mg.isActive,
          })),
        })
      }
    }

    if (copyFlags.copySeatingSections) {
      const seatingSections = await prisma.seatingSection.findMany({
        where: { eventId: sourceId },
      })

      if (seatingSections.length > 0) {
        await prisma.seatingSection.createMany({
          data: seatingSections.map((sec) => ({
            eventId: targetEventId,
            name: sec.name,
            sectionCode: sec.sectionCode,
            color: sec.color,
            capacity: sec.capacity,
            currentOccupancy: 0,
            locationDescription: sec.locationDescription,
            publicVisible: sec.publicVisible,
            displayOrder: sec.displayOrder,
          })),
        })
      }
    }

    if (copyFlags.copySchedule) {
      const scheduleEntries = await prisma.porosScheduleEntry.findMany({
        where: { eventId: sourceId },
      })

      if (scheduleEntries.length > 0) {
        await prisma.porosScheduleEntry.createMany({
          data: scheduleEntries.map((entry) => ({
            eventId: targetEventId,
            day: entry.day,
            dayDate: shiftDateByOneYear(entry.dayDate ?? null),
            startTime: entry.startTime,
            endTime: entry.endTime,
            title: entry.title,
            location: entry.location,
            description: entry.description,
            order: entry.order,
          })),
        })
      }
    }

    if (copyFlags.copyMealTimes) {
      const mealTimes = await prisma.porosMealTime.findMany({
        where: { eventId: sourceId },
      })

      if (mealTimes.length > 0) {
        await prisma.porosMealTime.createMany({
          data: mealTimes.map((mt) => ({
            eventId: targetEventId,
            day: mt.day,
            dayDate: shiftDateByOneYear(mt.dayDate ?? null),
            meal: mt.meal,
            color: mt.color,
            time: mt.time,
            order: mt.order,
          })),
        })
      }
    }

    if (copyFlags.copyConfessions) {
      const confessions = await prisma.porosConfession.findMany({
        where: { eventId: sourceId },
      })

      if (confessions.length > 0) {
        await prisma.porosConfession.createMany({
          data: confessions.map((c) => ({
            eventId: targetEventId,
            day: c.day,
            startTime: c.startTime,
            endTime: c.endTime,
            location: c.location,
            description: c.description,
            isActive: c.isActive,
            order: c.order,
          })),
        })
      }
    }

    if (copyFlags.copyAdoration) {
      const adorations = await prisma.porosAdoration.findMany({
        where: { eventId: sourceId },
      })

      if (adorations.length > 0) {
        await prisma.porosAdoration.createMany({
          data: adorations.map((a) => ({
            eventId: targetEventId,
            day: a.day,
            startTime: a.startTime,
            endTime: a.endTime,
            location: a.location,
            description: a.description,
            isActive: a.isActive,
            order: a.order,
          })),
        })
      }
    }

    if (copyFlags.copyAnnouncements) {
      const announcements = await prisma.porosAnnouncement.findMany({
        where: { eventId: sourceId },
      })

      if (announcements.length > 0) {
        await prisma.porosAnnouncement.createMany({
          data: announcements.map((ann) => ({
            eventId: targetEventId,
            title: ann.title,
            message: ann.message,
            type: ann.type,
            startDate: shiftDateByOneYear(ann.startDate ?? null),
            endDate: shiftDateByOneYear(ann.endDate ?? null),
            isActive: ann.isActive,
            order: ann.order,
          })),
        })
      }
    }

    if (copyFlags.copyInfoItems) {
      const infoItems = await prisma.porosInfoItem.findMany({
        where: { eventId: sourceId },
      })

      if (infoItems.length > 0) {
        await prisma.porosInfoItem.createMany({
          data: infoItems.map((item) => ({
            eventId: targetEventId,
            title: item.title,
            content: item.content,
            type: item.type,
            url: item.url,
            isActive: item.isActive,
            order: item.order,
          })),
        })
      }
    }

    if (copyFlags.copyResources) {
      const resources = await prisma.porosResource.findMany({
        where: { eventId: sourceId },
      })

      if (resources.length > 0) {
        await prisma.porosResource.createMany({
          data: resources.map((r) => ({
            eventId: targetEventId,
            name: r.name,
            type: r.type,
            url: r.url,
            order: r.order,
            isActive: r.isActive,
          })),
        })
      }
    }

    if (copyFlags.copyNameTagTemplate) {
      const nameTagTemplate = await prisma.nameTagTemplate.findUnique({
        where: { eventId: sourceId },
      })

      if (nameTagTemplate) {
        // Only create if target doesn't already have one
        const existing = await prisma.nameTagTemplate.findUnique({
          where: { eventId: targetEventId },
        })

        if (!existing) {
          await prisma.nameTagTemplate.create({
            data: {
              eventId: targetEventId,
              templateType: nameTagTemplate.templateType,
              logoUrl: nameTagTemplate.logoUrl,
              backgroundUrl: nameTagTemplate.backgroundUrl,
              primaryColor: nameTagTemplate.primaryColor,
              accentColor: nameTagTemplate.accentColor,
              textColor: nameTagTemplate.textColor,
              tagSize: nameTagTemplate.tagSize,
              showParish: nameTagTemplate.showParish,
              showAge: nameTagTemplate.showAge,
              showGrade: nameTagTemplate.showGrade,
              showCityState: nameTagTemplate.showCityState,
              showRole: nameTagTemplate.showRole,
              showMealColor: nameTagTemplate.showMealColor,
              showSmallGroup: nameTagTemplate.showSmallGroup,
              showHousing: nameTagTemplate.showHousing,
              showQrCode: nameTagTemplate.showQrCode,
              settingsJson: nameTagTemplate.settingsJson as any,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error copying POROS data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
