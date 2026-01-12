import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Use verifyEventAccess for consistent auth across all routes
    const { error, user, event: eventFromAuth } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Event]',
    })

    if (error) {
      return error
    }

    // User and event are guaranteed to exist if no error
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    console.log('[GET Event] ✅ Access verified for event:', eventFromAuth?.name)

    // Now fetch full event data with additional relations
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        settings: true,
        pricing: true,
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch payment balances for stats calculation
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: { eventId },
    })

    // Count participants
    const participantCount = await prisma.participant.count({
      where: {
        groupRegistration: { eventId },
      },
    })

    // Calculate stats
    const totalRegistrations = (event._count?.groupRegistrations || 0) + (event._count?.individualRegistrations || 0)
    const totalParticipants = participantCount + (event._count?.individualRegistrations || 0)
    const totalRevenue = paymentBalances.reduce(
      (sum: number, balance: any) => sum + Number(balance.totalAmountDue || 0),
      0
    )
    const totalPaid = paymentBalances.reduce(
      (sum: number, balance: any) => sum + Number(balance.amountPaid || 0),
      0
    )

    return NextResponse.json({
      event: {
        ...event,
        startDate: event.startDate?.toISOString(),
        endDate: event.endDate?.toISOString(),
      },
      stats: {
        totalRegistrations,
        totalParticipants,
        totalRevenue,
        totalPaid,
        balance: totalRevenue - totalPaid,
      },
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Use verifyEventAccess for consistent auth across all routes
    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Event]',
    })

    if (error) {
      return error
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    console.log('[PUT Event] ✅ Access verified, processing update')

    const data = await request.json()

    // Validate required fields based on status
    if (!data.name || !data.slug) {
      return NextResponse.json(
        { error: 'Event name and slug are required' },
        { status: 400 }
      )
    }

    // For published events, require dates
    if (data.status === 'published') {
      if (!data.startDate || !data.endDate) {
        return NextResponse.json(
          { error: 'Start and end dates are required for published events' },
          { status: 400 }
        )
      }
    }

    // Verify event belongs to user's organization
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizationId: true,
        capacityTotal: true,
        capacityRemaining: true,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Calculate new capacity values
    // Only adjust capacityRemaining if capacityTotal has changed
    const newCapacityTotal = data.capacityTotal ? parseInt(data.capacityTotal) : null
    let newCapacityRemaining: number | null = null

    if (newCapacityTotal !== null) {
      if (existingEvent.capacityTotal !== null && existingEvent.capacityRemaining !== null) {
        // Calculate how many spots are taken
        const spotsTaken = existingEvent.capacityTotal - existingEvent.capacityRemaining
        // Adjust remaining capacity based on new total
        newCapacityRemaining = Math.max(0, newCapacityTotal - spotsTaken)
      } else {
        // No previous capacity set, so remaining = total
        newCapacityRemaining = newCapacityTotal
      }
    }

    // Update event with all related data
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        timezone: data.timezone || 'America/New_York',
        locationName: data.locationName || null,
        locationAddress: data.locationAddress || null,
        capacityTotal: newCapacityTotal,
        capacityRemaining: newCapacityRemaining,
        registrationOpenDate: data.registrationOpenDate
          ? new Date(data.registrationOpenDate)
          : null,
        registrationCloseDate: data.registrationCloseDate
          ? new Date(data.registrationCloseDate)
          : null,
        status: data.status || 'draft',
        enableWaitlist: data.enableWaitlist || false,
        waitlistCapacity: data.waitlistCapacity
          ? parseInt(data.waitlistCapacity)
          : null,

        // Update settings
        settings: {
          upsert: {
            create: {
              groupRegistrationEnabled: data.groupRegistrationEnabled !== false,
              individualRegistrationEnabled:
                data.individualRegistrationEnabled !== false,
              liabilityFormsRequiredGroup: true,
              liabilityFormsRequiredIndividual: data.liabilityFormsRequiredIndividual || false,
              showDietaryRestrictions: true,
              dietaryRestrictionsRequired: false,
              showAdaAccommodations: true,
              adaAccommodationsRequired: false,
              porosHousingEnabled: data.porosHousingEnabled || false,
              porosPriestHousingEnabled: data.porosHousingEnabled || false,
              porosSeatingEnabled: data.porosHousingEnabled || false,
              porosMealColorsEnabled: data.porosHousingEnabled || false,
              porosSmallGroupEnabled: data.porosHousingEnabled || false,
              porosSglEnabled: data.porosHousingEnabled || false,
              porosSeminarianEnabled: data.porosHousingEnabled || false,
              porosReligiousStaffEnabled: data.porosHousingEnabled || false,
              porosAdaEnabled: data.porosHousingEnabled || false,
              publicPortalEnabled: data.publicPortalEnabled || false,
              staffRegistrationEnabled: data.staffRegistrationEnabled || false,
              vendorRegistrationEnabled: data.vendorRegistrationEnabled || false,
              staffVolunteerPrice: data.staffVolunteerPrice ? parseFloat(data.staffVolunteerPrice) : 0,
              vendorStaffPrice: data.vendorStaffPrice ? parseFloat(data.vendorStaffPrice) : 0,
              staffRoles: data.staffRoles || null,
              vendorTiers: data.vendorTiers || null,
              salveCheckinEnabled: data.salveCheckinEnabled || false,
              raphaMedicalEnabled: data.raphaMedicalEnabled || false,
              tshirtsEnabled: data.tshirtsEnabled || false,
              individualMealsEnabled: data.individualMealsEnabled || false,
              registrationInstructions: data.registrationInstructions || null,
              confirmationEmailMessage: data.confirmationEmailMessage || null,
              checkPaymentEnabled: data.checkPaymentEnabled !== false,
              checkPaymentPayableTo: data.checkPaymentPayableTo || null,
              checkPaymentAddress: data.checkPaymentAddress || null,
              allowOnCampus: data.allowOnCampus !== false,
              allowOffCampus: data.allowOffCampus !== false,
              allowDayPass: data.allowDayPass || false,
              allowIndividualDayPass: data.allowIndividualDayPass || false,
              allowSingleRoom: data.allowSingleRoom !== false,
              allowDoubleRoom: data.allowDoubleRoom !== false,
              allowTripleRoom: data.allowTripleRoom !== false,
              allowQuadRoom: data.allowQuadRoom !== false,
              singleRoomLabel: data.singleRoomLabel || null,
              doubleRoomLabel: data.doubleRoomLabel || null,
              tripleRoomLabel: data.tripleRoomLabel || null,
              quadRoomLabel: data.quadRoomLabel || null,
              allowLoginWhenClosed: data.allowLoginWhenClosed !== false,
              // Add-ons
              addOn1Enabled: data.addOn1Enabled || false,
              addOn1Title: data.addOn1Title || null,
              addOn1Description: data.addOn1Description || null,
              addOn1Price: data.addOn1Price ? parseFloat(data.addOn1Price) : null,
              addOn2Enabled: data.addOn2Enabled || false,
              addOn2Title: data.addOn2Title || null,
              addOn2Description: data.addOn2Description || null,
              addOn2Price: data.addOn2Price ? parseFloat(data.addOn2Price) : null,
              addOn3Enabled: data.addOn3Enabled || false,
              addOn3Title: data.addOn3Title || null,
              addOn3Description: data.addOn3Description || null,
              addOn3Price: data.addOn3Price ? parseFloat(data.addOn3Price) : null,
              addOn4Enabled: data.addOn4Enabled || false,
              addOn4Title: data.addOn4Title || null,
              addOn4Description: data.addOn4Description || null,
              addOn4Price: data.addOn4Price ? parseFloat(data.addOn4Price) : null,
              landingPageShowPrice: data.landingPageShowPrice !== false,
              landingPageShowSchedule: data.landingPageShowSchedule !== false,
              landingPageShowFaq: data.landingPageShowFaq !== false,
              landingPageShowIncluded: data.landingPageShowIncluded !== false,
              landingPageShowBring: data.landingPageShowBring !== false,
              landingPageShowContact: data.landingPageShowContact !== false,
              landingPageShowGallery: data.landingPageShowGallery || false,
              landingPageShowSponsors: data.landingPageShowSponsors || false,
              showAvailability: data.showAvailability !== false,
              showCapacity: data.showCapacity !== false,
              availabilityThreshold: parseInt(data.availabilityThreshold) || 20,
              countdownLocation: data.countdownLocation || 'hero',
              countdownBeforeOpen: data.countdownBeforeOpen !== false,
              countdownBeforeClose: data.countdownBeforeClose !== false,
              // Landing page content
              faqContent: data.faqContent || null,
              scheduleContent: data.scheduleContent || null,
              includedContent: data.includedContent || null,
              bringContent: data.bringContent || null,
              contactInfo: data.contactInfo || null,
              // Email options
              showFaqInEmail: data.showFaqInEmail || false,
              showBringInEmail: data.showBringInEmail || false,
              showScheduleInEmail: data.showScheduleInEmail || false,
              showIncludedInEmail: data.showIncludedInEmail || false,
              showContactInEmail: data.showContactInEmail !== false,
              backgroundImageUrl: data.backgroundImageUrl || null,
              primaryColor: data.primaryColor || '#1E3A5F',
              secondaryColor: data.secondaryColor || '#9C8466',
              overlayColor: data.overlayColor || '#000000',
              overlayOpacity: parseInt(data.overlayOpacity) || 40,
            },
            update: {
              groupRegistrationEnabled: data.groupRegistrationEnabled !== false,
              individualRegistrationEnabled:
                data.individualRegistrationEnabled !== false,
              liabilityFormsRequiredIndividual: data.liabilityFormsRequiredIndividual || false,
              porosHousingEnabled: data.porosHousingEnabled || false,
              porosPriestHousingEnabled: data.porosHousingEnabled || false,
              porosSeatingEnabled: data.porosHousingEnabled || false,
              porosMealColorsEnabled: data.porosHousingEnabled || false,
              porosSmallGroupEnabled: data.porosHousingEnabled || false,
              porosSglEnabled: data.porosHousingEnabled || false,
              porosSeminarianEnabled: data.porosHousingEnabled || false,
              porosReligiousStaffEnabled: data.porosHousingEnabled || false,
              porosAdaEnabled: data.porosHousingEnabled || false,
              publicPortalEnabled: data.publicPortalEnabled || false,
              staffRegistrationEnabled: data.staffRegistrationEnabled || false,
              vendorRegistrationEnabled: data.vendorRegistrationEnabled || false,
              staffVolunteerPrice: data.staffVolunteerPrice ? parseFloat(data.staffVolunteerPrice) : 0,
              vendorStaffPrice: data.vendorStaffPrice ? parseFloat(data.vendorStaffPrice) : 0,
              staffRoles: data.staffRoles || null,
              vendorTiers: data.vendorTiers || null,
              salveCheckinEnabled: data.salveCheckinEnabled || false,
              raphaMedicalEnabled: data.raphaMedicalEnabled || false,
              tshirtsEnabled: data.tshirtsEnabled || false,
              individualMealsEnabled: data.individualMealsEnabled || false,
              registrationInstructions: data.registrationInstructions || null,
              confirmationEmailMessage: data.confirmationEmailMessage || null,
              checkPaymentEnabled: data.checkPaymentEnabled !== false,
              checkPaymentPayableTo: data.checkPaymentPayableTo || null,
              checkPaymentAddress: data.checkPaymentAddress || null,
              allowOnCampus: data.allowOnCampus !== false,
              allowOffCampus: data.allowOffCampus !== false,
              allowDayPass: data.allowDayPass || false,
              allowIndividualDayPass: data.allowIndividualDayPass || false,
              allowSingleRoom: data.allowSingleRoom !== false,
              allowDoubleRoom: data.allowDoubleRoom !== false,
              allowTripleRoom: data.allowTripleRoom !== false,
              allowQuadRoom: data.allowQuadRoom !== false,
              singleRoomLabel: data.singleRoomLabel || null,
              doubleRoomLabel: data.doubleRoomLabel || null,
              tripleRoomLabel: data.tripleRoomLabel || null,
              quadRoomLabel: data.quadRoomLabel || null,
              allowLoginWhenClosed: data.allowLoginWhenClosed !== false,
              // Add-ons
              addOn1Enabled: data.addOn1Enabled || false,
              addOn1Title: data.addOn1Title || null,
              addOn1Description: data.addOn1Description || null,
              addOn1Price: data.addOn1Price ? parseFloat(data.addOn1Price) : null,
              addOn2Enabled: data.addOn2Enabled || false,
              addOn2Title: data.addOn2Title || null,
              addOn2Description: data.addOn2Description || null,
              addOn2Price: data.addOn2Price ? parseFloat(data.addOn2Price) : null,
              addOn3Enabled: data.addOn3Enabled || false,
              addOn3Title: data.addOn3Title || null,
              addOn3Description: data.addOn3Description || null,
              addOn3Price: data.addOn3Price ? parseFloat(data.addOn3Price) : null,
              addOn4Enabled: data.addOn4Enabled || false,
              addOn4Title: data.addOn4Title || null,
              addOn4Description: data.addOn4Description || null,
              addOn4Price: data.addOn4Price ? parseFloat(data.addOn4Price) : null,
              landingPageShowPrice: data.landingPageShowPrice !== false,
              landingPageShowSchedule: data.landingPageShowSchedule !== false,
              landingPageShowFaq: data.landingPageShowFaq !== false,
              landingPageShowIncluded: data.landingPageShowIncluded !== false,
              landingPageShowBring: data.landingPageShowBring !== false,
              landingPageShowContact: data.landingPageShowContact !== false,
              showAvailability: data.showAvailability !== false,
              showCapacity: data.showCapacity !== false,
              availabilityThreshold: parseInt(data.availabilityThreshold) || 20,
              countdownLocation: data.countdownLocation || 'hero',
              countdownBeforeOpen: data.countdownBeforeOpen !== false,
              countdownBeforeClose: data.countdownBeforeClose !== false,
              // Landing page content
              faqContent: data.faqContent || null,
              scheduleContent: data.scheduleContent || null,
              includedContent: data.includedContent || null,
              bringContent: data.bringContent || null,
              contactInfo: data.contactInfo || null,
              // Email options
              showFaqInEmail: data.showFaqInEmail || false,
              showBringInEmail: data.showBringInEmail || false,
              showScheduleInEmail: data.showScheduleInEmail || false,
              showIncludedInEmail: data.showIncludedInEmail || false,
              showContactInEmail: data.showContactInEmail !== false,
              backgroundImageUrl: data.backgroundImageUrl || null,
              primaryColor: data.primaryColor || '#1E3A5F',
              secondaryColor: data.secondaryColor || '#9C8466',
              overlayColor: data.overlayColor || '#000000',
              overlayOpacity: parseInt(data.overlayOpacity) || 40,
            },
          },
        },

        // Update pricing
        pricing: {
          upsert: {
            create: {
              youthEarlyBirdPrice: data.youthEarlyBirdPrice
                ? parseFloat(data.youthEarlyBirdPrice)
                : null,
              youthRegularPrice: parseFloat(data.youthRegularPrice) || 100,
              youthLatePrice: data.youthLatePrice
                ? parseFloat(data.youthLatePrice)
                : null,
              chaperoneEarlyBirdPrice: data.chaperoneEarlyBirdPrice
                ? parseFloat(data.chaperoneEarlyBirdPrice)
                : null,
              chaperoneRegularPrice:
                parseFloat(data.chaperoneRegularPrice) || 75,
              chaperoneLatePrice: data.chaperoneLatePrice
                ? parseFloat(data.chaperoneLatePrice)
                : null,
              priestPrice: parseFloat(data.priestPrice) || 0,
              onCampusYouthPrice: data.onCampusYouthPrice
                ? parseFloat(data.onCampusYouthPrice)
                : null,
              offCampusYouthPrice: data.offCampusYouthPrice
                ? parseFloat(data.offCampusYouthPrice)
                : null,
              dayPassYouthPrice: data.dayPassYouthPrice
                ? parseFloat(data.dayPassYouthPrice)
                : null,
              onCampusChaperonePrice: data.onCampusChaperonePrice
                ? parseFloat(data.onCampusChaperonePrice)
                : null,
              offCampusChaperonePrice: data.offCampusChaperonePrice
                ? parseFloat(data.offCampusChaperonePrice)
                : null,
              dayPassChaperonePrice: data.dayPassChaperonePrice
                ? parseFloat(data.dayPassChaperonePrice)
                : null,
              individualEarlyBirdPrice: data.individualEarlyBirdPrice
                ? parseFloat(data.individualEarlyBirdPrice)
                : null,
              individualBasePrice: data.individualBasePrice
                ? parseFloat(data.individualBasePrice)
                : null,
              individualLatePrice: data.individualLatePrice
                ? parseFloat(data.individualLatePrice)
                : null,
              singleRoomPrice: data.singleRoomPrice
                ? parseFloat(data.singleRoomPrice)
                : null,
              doubleRoomPrice: data.doubleRoomPrice
                ? parseFloat(data.doubleRoomPrice)
                : null,
              tripleRoomPrice: data.tripleRoomPrice
                ? parseFloat(data.tripleRoomPrice)
                : null,
              quadRoomPrice: data.quadRoomPrice
                ? parseFloat(data.quadRoomPrice)
                : null,
              individualOffCampusPrice: data.individualOffCampusPrice
                ? parseFloat(data.individualOffCampusPrice)
                : null,
              individualDayPassPrice: data.individualDayPassPrice
                ? parseFloat(data.individualDayPassPrice)
                : null,
              individualMealPackagePrice: data.individualMealPackagePrice
                ? parseFloat(data.individualMealPackagePrice)
                : null,
              depositAmount:
                data.depositType === 'fixed' && data.depositAmount
                  ? parseFloat(data.depositAmount)
                  : null,
              depositPercentage:
                data.depositType === 'percentage' && data.depositPercentage
                  ? parseFloat(data.depositPercentage)
                  : null,
              requireFullPayment: data.depositType === 'full',
              depositPerPerson: true,
              earlyBirdDeadline: data.earlyBirdDeadline
                ? new Date(data.earlyBirdDeadline)
                : null,
              regularDeadline: data.regularDeadline
                ? new Date(data.regularDeadline)
                : null,
              fullPaymentDeadline: data.fullPaymentDeadline
                ? new Date(data.fullPaymentDeadline)
                : null,
              lateFeePercentage: data.lateFeePercentage
                ? parseFloat(data.lateFeePercentage)
                : null,
              lateFeeAutoApply: data.lateFeeAutoApply || false,
              currency: 'USD',
            },
            update: {
              youthEarlyBirdPrice: data.youthEarlyBirdPrice
                ? parseFloat(data.youthEarlyBirdPrice)
                : null,
              youthRegularPrice: parseFloat(data.youthRegularPrice) || 100,
              youthLatePrice: data.youthLatePrice
                ? parseFloat(data.youthLatePrice)
                : null,
              chaperoneEarlyBirdPrice: data.chaperoneEarlyBirdPrice
                ? parseFloat(data.chaperoneEarlyBirdPrice)
                : null,
              chaperoneRegularPrice:
                parseFloat(data.chaperoneRegularPrice) || 75,
              chaperoneLatePrice: data.chaperoneLatePrice
                ? parseFloat(data.chaperoneLatePrice)
                : null,
              priestPrice: parseFloat(data.priestPrice) || 0,
              onCampusYouthPrice: data.onCampusYouthPrice
                ? parseFloat(data.onCampusYouthPrice)
                : null,
              offCampusYouthPrice: data.offCampusYouthPrice
                ? parseFloat(data.offCampusYouthPrice)
                : null,
              dayPassYouthPrice: data.dayPassYouthPrice
                ? parseFloat(data.dayPassYouthPrice)
                : null,
              onCampusChaperonePrice: data.onCampusChaperonePrice
                ? parseFloat(data.onCampusChaperonePrice)
                : null,
              offCampusChaperonePrice: data.offCampusChaperonePrice
                ? parseFloat(data.offCampusChaperonePrice)
                : null,
              dayPassChaperonePrice: data.dayPassChaperonePrice
                ? parseFloat(data.dayPassChaperonePrice)
                : null,
              individualEarlyBirdPrice: data.individualEarlyBirdPrice
                ? parseFloat(data.individualEarlyBirdPrice)
                : null,
              individualBasePrice: data.individualBasePrice
                ? parseFloat(data.individualBasePrice)
                : null,
              individualLatePrice: data.individualLatePrice
                ? parseFloat(data.individualLatePrice)
                : null,
              singleRoomPrice: data.singleRoomPrice
                ? parseFloat(data.singleRoomPrice)
                : null,
              doubleRoomPrice: data.doubleRoomPrice
                ? parseFloat(data.doubleRoomPrice)
                : null,
              tripleRoomPrice: data.tripleRoomPrice
                ? parseFloat(data.tripleRoomPrice)
                : null,
              quadRoomPrice: data.quadRoomPrice
                ? parseFloat(data.quadRoomPrice)
                : null,
              individualOffCampusPrice: data.individualOffCampusPrice
                ? parseFloat(data.individualOffCampusPrice)
                : null,
              individualDayPassPrice: data.individualDayPassPrice
                ? parseFloat(data.individualDayPassPrice)
                : null,
              individualMealPackagePrice: data.individualMealPackagePrice
                ? parseFloat(data.individualMealPackagePrice)
                : null,
              depositAmount:
                data.depositType === 'fixed' && data.depositAmount
                  ? parseFloat(data.depositAmount)
                  : null,
              depositPercentage:
                data.depositType === 'percentage' && data.depositPercentage
                  ? parseFloat(data.depositPercentage)
                  : null,
              requireFullPayment: data.depositType === 'full',
              earlyBirdDeadline: data.earlyBirdDeadline
                ? new Date(data.earlyBirdDeadline)
                : null,
              regularDeadline: data.regularDeadline
                ? new Date(data.regularDeadline)
                : null,
              fullPaymentDeadline: data.fullPaymentDeadline
                ? new Date(data.fullPaymentDeadline)
                : null,
              lateFeePercentage: data.lateFeePercentage
                ? parseFloat(data.lateFeePercentage)
                : null,
              lateFeeAutoApply: data.lateFeeAutoApply || false,
            },
          },
        },
      },
      include: {
        settings: true,
        pricing: true,
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Use verifyEventAccess for consistent auth across all routes
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Event]',
    })

    if (error) {
      return error
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    console.log('[DELETE Event] ✅ Access verified, checking registrations')

    // Verify event belongs to user's organization and check registration counts
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizationId: true,
        _count: {
          select: {
            groupRegistrations: true,
            individualRegistrations: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event has registrations
    const totalRegistrations =
      event._count.groupRegistrations + event._count.individualRegistrations

    if (totalRegistrations > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete event with ${totalRegistrations} registration(s). Please contact support if you need to delete this event.`,
        },
        { status: 400 }
      )
    }

    // Delete the event (cascade will handle related records)
    await prisma.event.delete({
      where: { id: eventId },
    })

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
