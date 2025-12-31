import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user)

    const data = await request.json()

    // Validate required fields based on status
    if (!data.name || !data.slug) {
      return NextResponse.json(
        { error: 'Event name and slug are required' },
        { status: 400 }
      )
    }

    // Get organization to check event limits
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        eventsPerYearLimit: true,
        eventsUsed: true,
        subscriptionTier: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization has exceeded event limit (HARD LIMIT - block creation)
    if (organization.eventsPerYearLimit !== null) {
      if (organization.eventsUsed >= organization.eventsPerYearLimit) {
        return NextResponse.json(
          {
            error: `Event limit reached. Your ${organization.subscriptionTier} plan allows ${organization.eventsPerYearLimit} events per year. You have used ${organization.eventsUsed}. Please upgrade your subscription or contact support.`,
            limitReached: true,
            currentUsage: organization.eventsUsed,
            limit: organization.eventsPerYearLimit,
          },
          { status: 403 }
        )
      }
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

    // Create event with all related data
    const event = await prisma.event.create({
      data: {
        organizationId: organizationId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        timezone: data.timezone || 'America/New_York',
        locationName: data.locationName || null,
        locationAddress: data.locationAddress || null,
        capacityTotal: parseInt(data.capacityTotal) || null,
        capacityRemaining: parseInt(data.capacityTotal) || null,
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
        createdBy: user.id,

        // Create related event settings
        settings: {
          create: {
            groupRegistrationEnabled: data.groupRegistrationEnabled !== false,
            individualRegistrationEnabled:
              data.individualRegistrationEnabled !== false,
            liabilityFormsRequiredGroup: true,
            liabilityFormsRequiredIndividual: false,
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
            salveCheckinEnabled: data.salveCheckinEnabled || false,
            raphaMedicalEnabled: data.raphaMedicalEnabled || false,
            tshirtsEnabled: data.tshirtsEnabled || false,
            individualMealsEnabled: data.individualMealsEnabled || false,
            registrationInstructions: data.registrationInstructions || null,
            checkPaymentEnabled: data.checkPaymentEnabled !== false,
            checkPaymentPayableTo: data.checkPaymentPayableTo || null,
            checkPaymentAddress: data.checkPaymentAddress || null,
            allowOnCampus: data.allowOnCampus !== false,
            allowOffCampus: data.allowOffCampus !== false,
            allowDayPass: data.allowDayPass !== false,
            allowSingleRoom: data.allowSingleRoom !== false,
            allowDoubleRoom: data.allowDoubleRoom !== false,
            allowTripleRoom: data.allowTripleRoom !== false,
            allowQuadRoom: data.allowQuadRoom !== false,
            singleRoomLabel: data.singleRoomLabel || null,
            doubleRoomLabel: data.doubleRoomLabel || null,
            tripleRoomLabel: data.tripleRoomLabel || null,
            quadRoomLabel: data.quadRoomLabel || null,
            landingPageShowPrice: data.landingPageShowPrice !== false,
            landingPageShowSchedule: data.landingPageShowSchedule !== false,
            landingPageShowFaq: data.landingPageShowFaq !== false,
            landingPageShowIncluded: data.landingPageShowIncluded !== false,
            landingPageShowBring: data.landingPageShowBring !== false,
            landingPageShowContact: data.landingPageShowContact !== false,
            landingPageShowGallery: data.landingPageShowGallery || false,
            landingPageShowSponsors: data.landingPageShowSponsors || false,
            showAvailability: data.showAvailability !== false,
            availabilityThreshold: parseInt(data.availabilityThreshold) || 20,
            countdownLocation: data.countdownLocation || 'hero',
            countdownBeforeOpen: data.countdownBeforeOpen !== false,
            countdownBeforeClose: data.countdownBeforeClose !== false,
            backgroundImageUrl: data.backgroundImageUrl || null,
            primaryColor: data.primaryColor || '#1E3A5F',
            secondaryColor: data.secondaryColor || '#9C8466',
            overlayColor: data.overlayColor || '#000000',
            overlayOpacity: parseInt(data.overlayOpacity) || 40,
          },
        },

        // Create event pricing
        pricing: {
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
            individualBasePrice: data.individualBasePrice
              ? parseFloat(data.individualBasePrice)
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
        },
      },
      include: {
        settings: true,
        pricing: true,
      },
    })

    // Increment events used counter
    await prisma.organization.update({
      where: { id: organizationId },
      data: { eventsUsed: { increment: 1 } },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
