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

    // Fetch source event core data
    const sourceEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        settings: true,
        pricing: true,
        dayPassOptions: true,
        customRegistrationQuestions: true,
      },
    })

    if (!sourceEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (sourceEvent.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check event limits
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        eventsPerYearLimit: true,
        eventsUsed: true,
        subscriptionTier: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (organization.eventsPerYearLimit !== null) {
      if (organization.eventsUsed >= organization.eventsPerYearLimit) {
        return NextResponse.json(
          {
            error: `Event limit reached. Your ${organization.subscriptionTier} plan allows ${organization.eventsPerYearLimit} events per year.`,
            limitReached: true,
          },
          { status: 403 }
        )
      }
    }

    // Fetch all POROS structural data separately (no back-relations on Event)
    const [
      buildings,
      smallGroups,
      mealGroups,
      seatingSections,
      scheduleEntries,
      mealTimes,
      announcements,
      infoItems,
      confessions,
      adorations,
      resources,
      nameTagTemplate,
    ] = await Promise.all([
      prisma.building.findMany({
        where: { eventId: eventId },
        include: { rooms: true },
      }),
      prisma.smallGroup.findMany({ where: { eventId: eventId } }),
      prisma.mealGroup.findMany({ where: { eventId: eventId } }),
      prisma.seatingSection.findMany({ where: { eventId: eventId } }),
      prisma.porosScheduleEntry.findMany({ where: { eventId: eventId } }),
      prisma.porosMealTime.findMany({ where: { eventId: eventId } }),
      prisma.porosAnnouncement.findMany({ where: { eventId: eventId } }),
      prisma.porosInfoItem.findMany({ where: { eventId: eventId } }),
      prisma.porosConfession.findMany({ where: { eventId: eventId } }),
      prisma.porosAdoration.findMany({ where: { eventId: eventId } }),
      prisma.porosResource.findMany({ where: { eventId: eventId } }),
      prisma.nameTagTemplate.findUnique({ where: { eventId: eventId } }),
    ])

    // Build a unique slug for the duplicate
    const baseSlug = sourceEvent.slug.replace(/-copy(-\d+)?$/, '')
    const candidateSlug = `${baseSlug}-copy`
    const existingSlugs = await prisma.event.findMany({
      where: { slug: { startsWith: candidateSlug } },
      select: { slug: true },
    })
    let newSlug = candidateSlug
    if (existingSlugs.length > 0) {
      newSlug = `${candidateSlug}-${existingSlugs.length + 1}`
    }

    const newStartDate = shiftDateByOneYear(sourceEvent.startDate)!
    const newEndDate = shiftDateByOneYear(sourceEvent.endDate)!
    const newRegistrationOpenDate = shiftDateByOneYear(sourceEvent.registrationOpenDate)
    const newRegistrationCloseDate = shiftDateByOneYear(sourceEvent.registrationCloseDate)

    const s = sourceEvent.settings
    const p = sourceEvent.pricing

    // Create the duplicated event with settings and pricing
    const newEvent = await prisma.event.create({
      data: {
        organizationId,
        name: `${sourceEvent.name} (Copy)`,
        slug: newSlug,
        description: sourceEvent.description,
        startDate: newStartDate,
        endDate: newEndDate,
        timezone: sourceEvent.timezone,
        locationName: sourceEvent.locationName,
        locationAddress: sourceEvent.locationAddress as any,
        capacityTotal: sourceEvent.capacityTotal,
        capacityRemaining: sourceEvent.capacityTotal,
        registrationOpenDate: newRegistrationOpenDate,
        registrationCloseDate: newRegistrationCloseDate,
        status: 'draft',
        isPublished: false,
        enableWaitlist: sourceEvent.enableWaitlist,
        waitlistCapacity: sourceEvent.waitlistCapacity,
        createdBy: user.id,

        settings: s
          ? {
              create: {
                groupRegistrationEnabled: s.groupRegistrationEnabled,
                individualRegistrationEnabled: s.individualRegistrationEnabled,
                liabilityFormsRequiredGroup: s.liabilityFormsRequiredGroup,
                liabilityFormsRequiredIndividual: s.liabilityFormsRequiredIndividual,
                showDietaryRestrictions: s.showDietaryRestrictions,
                dietaryRestrictionsRequired: s.dietaryRestrictionsRequired,
                showAdaAccommodations: s.showAdaAccommodations,
                adaAccommodationsRequired: s.adaAccommodationsRequired,
                porosHousingEnabled: s.porosHousingEnabled,
                porosPriestHousingEnabled: s.porosPriestHousingEnabled,
                porosSeatingEnabled: s.porosSeatingEnabled,
                porosMealColorsEnabled: s.porosMealColorsEnabled,
                porosSmallGroupEnabled: s.porosSmallGroupEnabled,
                porosSglEnabled: s.porosSglEnabled,
                porosSeminarianEnabled: s.porosSeminarianEnabled,
                porosReligiousStaffEnabled: s.porosReligiousStaffEnabled,
                porosAdaEnabled: s.porosAdaEnabled,
                porosConfessionsEnabled: s.porosConfessionsEnabled,
                porosPublicPortalEnabled: s.porosPublicPortalEnabled,
                publicPortalEnabled: s.publicPortalEnabled,
                salveCheckinEnabled: s.salveCheckinEnabled,
                raphaMedicalEnabled: s.raphaMedicalEnabled,
                tshirtsEnabled: s.tshirtsEnabled,
                individualMealsEnabled: s.individualMealsEnabled,
                registrationInstructions: s.registrationInstructions,
                confirmationEmailMessage: s.confirmationEmailMessage,
                checkPaymentEnabled: s.checkPaymentEnabled,
                checkPaymentPayableTo: s.checkPaymentPayableTo,
                checkPaymentAddress: s.checkPaymentAddress,
                allowOnCampus: s.allowOnCampus,
                allowOffCampus: s.allowOffCampus,
                allowDayPass: s.allowDayPass,
                allowSingleRoom: s.allowSingleRoom,
                allowDoubleRoom: s.allowDoubleRoom,
                allowTripleRoom: s.allowTripleRoom,
                allowQuadRoom: s.allowQuadRoom,
                singleRoomLabel: s.singleRoomLabel,
                doubleRoomLabel: s.doubleRoomLabel,
                tripleRoomLabel: s.tripleRoomLabel,
                quadRoomLabel: s.quadRoomLabel,
                onCampusCapacity: s.onCampusCapacity,
                onCampusRemaining: s.onCampusCapacity,
                offCampusCapacity: s.offCampusCapacity,
                offCampusRemaining: s.offCampusCapacity,
                dayPassCapacity: s.dayPassCapacity,
                dayPassRemaining: s.dayPassCapacity,
                singleRoomCapacity: s.singleRoomCapacity,
                singleRoomRemaining: s.singleRoomCapacity,
                doubleRoomCapacity: s.doubleRoomCapacity,
                doubleRoomRemaining: s.doubleRoomCapacity,
                tripleRoomCapacity: s.tripleRoomCapacity,
                tripleRoomRemaining: s.tripleRoomCapacity,
                quadRoomCapacity: s.quadRoomCapacity,
                quadRoomRemaining: s.quadRoomCapacity,
                landingPageShowPrice: s.landingPageShowPrice,
                landingPageShowSchedule: s.landingPageShowSchedule,
                landingPageShowFaq: s.landingPageShowFaq,
                landingPageShowIncluded: s.landingPageShowIncluded,
                landingPageShowBring: s.landingPageShowBring,
                landingPageShowContact: s.landingPageShowContact,
                landingPageShowGallery: s.landingPageShowGallery,
                landingPageShowSponsors: s.landingPageShowSponsors,
                showAvailability: s.showAvailability,
                availabilityThreshold: s.availabilityThreshold,
                countdownLocation: s.countdownLocation,
                countdownBeforeOpen: s.countdownBeforeOpen,
                countdownBeforeClose: s.countdownBeforeClose,
                backgroundImageUrl: s.backgroundImageUrl,
                primaryColor: s.primaryColor,
                secondaryColor: s.secondaryColor,
                overlayColor: s.overlayColor,
                overlayOpacity: s.overlayOpacity,
                waitlistEnabled: s.waitlistEnabled,
                registrationClosedMessage: s.registrationClosedMessage,
                staffRegistrationEnabled: s.staffRegistrationEnabled,
                staffVolunteerPrice: s.staffVolunteerPrice,
                vendorStaffPrice: s.vendorStaffPrice,
                staffRoles: s.staffRoles as any,
                vendorRegistrationEnabled: s.vendorRegistrationEnabled,
                vendorTiers: s.vendorTiers as any,
                allowLoginWhenClosed: s.allowLoginWhenClosed,
                showCapacity: s.showCapacity,
                allowIndividualDayPass: s.allowIndividualDayPass,
                faqContent: s.faqContent,
                scheduleContent: s.scheduleContent,
                includedContent: s.includedContent,
                bringContent: s.bringContent,
                contactInfo: s.contactInfo,
                contactEmail: s.contactEmail,
                contactPhone: s.contactPhone,
                showFaqInEmail: s.showFaqInEmail,
                showBringInEmail: s.showBringInEmail,
                showScheduleInEmail: s.showScheduleInEmail,
                showIncludedInEmail: s.showIncludedInEmail,
                showContactInEmail: s.showContactInEmail,
                addOn1Enabled: s.addOn1Enabled,
                addOn1Title: s.addOn1Title,
                addOn1Description: s.addOn1Description,
                addOn1Price: s.addOn1Price,
                addOn2Enabled: s.addOn2Enabled,
                addOn2Title: s.addOn2Title,
                addOn2Description: s.addOn2Description,
                addOn2Price: s.addOn2Price,
                addOn3Enabled: s.addOn3Enabled,
                addOn3Title: s.addOn3Title,
                addOn3Description: s.addOn3Description,
                addOn3Price: s.addOn3Price,
                addOn4Enabled: s.addOn4Enabled,
                addOn4Title: s.addOn4Title,
                addOn4Description: s.addOn4Description,
                addOn4Price: s.addOn4Price,
                couponsEnabled: s.couponsEnabled,
                salvePacketSettings: s.salvePacketSettings as any,
                confessionsReconciliationGuideUrl: s.confessionsReconciliationGuideUrl,
                porosInfoEnabled: s.porosInfoEnabled,
                porosAdorationEnabled: s.porosAdorationEnabled,
              },
            }
          : undefined,

        pricing: p
          ? {
              create: {
                youthEarlyBirdPrice: p.youthEarlyBirdPrice,
                youthRegularPrice: p.youthRegularPrice,
                youthLatePrice: p.youthLatePrice,
                chaperoneEarlyBirdPrice: p.chaperoneEarlyBirdPrice,
                chaperoneRegularPrice: p.chaperoneRegularPrice,
                chaperoneLatePrice: p.chaperoneLatePrice,
                priestPrice: p.priestPrice,
                onCampusYouthPrice: p.onCampusYouthPrice,
                offCampusYouthPrice: p.offCampusYouthPrice,
                dayPassYouthPrice: p.dayPassYouthPrice,
                onCampusChaperonePrice: p.onCampusChaperonePrice,
                offCampusChaperonePrice: p.offCampusChaperonePrice,
                dayPassChaperonePrice: p.dayPassChaperonePrice,
                individualEarlyBirdPrice: p.individualEarlyBirdPrice,
                individualBasePrice: p.individualBasePrice,
                individualLatePrice: p.individualLatePrice,
                singleRoomPrice: p.singleRoomPrice,
                doubleRoomPrice: p.doubleRoomPrice,
                tripleRoomPrice: p.tripleRoomPrice,
                quadRoomPrice: p.quadRoomPrice,
                individualOffCampusPrice: p.individualOffCampusPrice,
                individualDayPassPrice: (p as any).individualDayPassPrice ?? null,
                individualMealPackagePrice: p.individualMealPackagePrice,
                depositAmount: p.depositAmount,
                depositPercentage: p.depositPercentage,
                requireFullPayment: p.requireFullPayment,
                depositPerPerson: p.depositPerPerson,
                earlyBirdDeadline: shiftDateByOneYear(p.earlyBirdDeadline ?? null),
                regularDeadline: shiftDateByOneYear(p.regularDeadline ?? null),
                fullPaymentDeadline: shiftDateByOneYear(p.fullPaymentDeadline ?? null),
                lateFeePercentage: p.lateFeePercentage,
                lateFeeAutoApply: p.lateFeeAutoApply,
                currency: p.currency,
              },
            }
          : undefined,
      },
      include: {
        settings: true,
        pricing: true,
      },
    })

    // ── Day pass options ────────────────────────────────────────────────────
    if (sourceEvent.dayPassOptions.length > 0) {
      await prisma.dayPassOption.createMany({
        data: sourceEvent.dayPassOptions.map((opt) => ({
          eventId: newEvent.id,
          organizationId,
          date: shiftDateByOneYear(opt.date)!,
          name: opt.name,
          capacity: opt.capacity,
          remaining: opt.capacity,
          price: opt.price,
          youthPrice: opt.youthPrice,
          chaperonePrice: opt.chaperonePrice,
          isActive: opt.isActive,
        })),
      })
    }

    // ── Custom registration questions ───────────────────────────────────────
    if (sourceEvent.customRegistrationQuestions.length > 0) {
      await prisma.customRegistrationQuestion.createMany({
        data: sourceEvent.customRegistrationQuestions.map((q) => ({
          eventId: newEvent.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options as any,
          required: q.required,
          appliesTo: q.appliesTo,
          displayOrder: q.displayOrder,
        })),
      })
    }

    // ── Buildings & rooms ───────────────────────────────────────────────────
    // Copies the physical venue layout. Occupancy and group allocations are
    // cleared — rooms start empty for the new event year.
    for (const building of buildings) {
      const newBuilding = await prisma.building.create({
        data: {
          eventId: newEvent.id,
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

    // ── Small groups ────────────────────────────────────────────────────────
    // Copies group names, numbers, capacities, and meeting details.
    // SGL/co-SGL links are cleared (staff roster rebuilt each year).
    // Meeting room links are cleared (rooms have new IDs). currentSize resets.
    if (smallGroups.length > 0) {
      await prisma.smallGroup.createMany({
        data: smallGroups.map((sg) => ({
          eventId: newEvent.id,
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

    // ── Meal groups ─────────────────────────────────────────────────────────
    if (mealGroups.length > 0) {
      await prisma.mealGroup.createMany({
        data: mealGroups.map((mg) => ({
          eventId: newEvent.id,
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

    // ── Seating sections ────────────────────────────────────────────────────
    if (seatingSections.length > 0) {
      await prisma.seatingSection.createMany({
        data: seatingSections.map((sec) => ({
          eventId: newEvent.id,
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

    // ── Schedule entries ────────────────────────────────────────────────────
    if (scheduleEntries.length > 0) {
      await prisma.porosScheduleEntry.createMany({
        data: scheduleEntries.map((entry) => ({
          eventId: newEvent.id,
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

    // ── Meal times ──────────────────────────────────────────────────────────
    if (mealTimes.length > 0) {
      await prisma.porosMealTime.createMany({
        data: mealTimes.map((mt) => ({
          eventId: newEvent.id,
          day: mt.day,
          dayDate: shiftDateByOneYear(mt.dayDate ?? null),
          meal: mt.meal,
          color: mt.color,
          time: mt.time,
          order: mt.order,
        })),
      })
    }

    // ── Announcements ───────────────────────────────────────────────────────
    if (announcements.length > 0) {
      await prisma.porosAnnouncement.createMany({
        data: announcements.map((ann) => ({
          eventId: newEvent.id,
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

    // ── Info items ──────────────────────────────────────────────────────────
    if (infoItems.length > 0) {
      await prisma.porosInfoItem.createMany({
        data: infoItems.map((item) => ({
          eventId: newEvent.id,
          title: item.title,
          content: item.content,
          type: item.type,
          url: item.url,
          isActive: item.isActive,
          order: item.order,
        })),
      })
    }

    // ── Confessions ─────────────────────────────────────────────────────────
    if (confessions.length > 0) {
      await prisma.porosConfession.createMany({
        data: confessions.map((c) => ({
          eventId: newEvent.id,
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

    // ── Adoration ───────────────────────────────────────────────────────────
    if (adorations.length > 0) {
      await prisma.porosAdoration.createMany({
        data: adorations.map((a) => ({
          eventId: newEvent.id,
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

    // ── Resources ───────────────────────────────────────────────────────────
    if (resources.length > 0) {
      await prisma.porosResource.createMany({
        data: resources.map((r) => ({
          eventId: newEvent.id,
          name: r.name,
          type: r.type,
          url: r.url,
          order: r.order,
          isActive: r.isActive,
        })),
      })
    }

    // ── Name tag template ───────────────────────────────────────────────────
    if (nameTagTemplate) {
      await prisma.nameTagTemplate.create({
        data: {
          eventId: newEvent.id,
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

    // ── Increment events used counter ───────────────────────────────────────
    await prisma.organization.update({
      where: { id: organizationId },
      data: { eventsUsed: { increment: 1 } },
    })

    return NextResponse.json({ event: newEvent })
  } catch (error) {
    console.error('Error duplicating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
