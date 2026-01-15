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
        dayPassOptions: {
          orderBy: { date: 'asc' },
        },
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

    // Get recent activity for activity report
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfLastWeek = new Date(startOfWeek)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

    // Recent registrations (last 5)
    const recentGroupRegistrations = await prisma.groupRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        groupName: true,
        totalParticipants: true,
        registeredAt: true,
      },
      orderBy: { registeredAt: 'desc' },
      take: 5,
    })

    const recentIndividualRegistrations = await prisma.individualRegistration.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Combine and sort recent registrations
    const recentRegistrations = [
      ...recentGroupRegistrations.map(r => ({
        id: r.id,
        type: 'group' as const,
        name: r.groupName || 'Unnamed Group',
        participants: r.totalParticipants,
        date: r.registeredAt,
      })),
      ...recentIndividualRegistrations.map(r => ({
        id: r.id,
        type: 'individual' as const,
        name: `${r.firstName} ${r.lastName}`,
        participants: 1,
        date: r.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    // Recent payments (last 5)
    const recentPayments = await prisma.payment.findMany({
      where: { eventId, paymentStatus: 'succeeded' },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paidAt: true,
        groupRegistration: {
          select: { groupName: true },
        },
        individualRegistration: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 5,
    })

    // Registration counts for trends
    const todayGroupCount = await prisma.groupRegistration.count({
      where: { eventId, registeredAt: { gte: startOfToday } },
    })
    const todayIndividualCount = await prisma.individualRegistration.count({
      where: { eventId, createdAt: { gte: startOfToday } },
    })

    const thisWeekGroupCount = await prisma.groupRegistration.count({
      where: { eventId, registeredAt: { gte: startOfWeek } },
    })
    const thisWeekIndividualCount = await prisma.individualRegistration.count({
      where: { eventId, createdAt: { gte: startOfWeek } },
    })

    const lastWeekGroupCount = await prisma.groupRegistration.count({
      where: { eventId, registeredAt: { gte: startOfLastWeek, lt: startOfWeek } },
    })
    const lastWeekIndividualCount = await prisma.individualRegistration.count({
      where: { eventId, createdAt: { gte: startOfLastWeek, lt: startOfWeek } },
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
      activity: {
        recentRegistrations: recentRegistrations.map(r => ({
          ...r,
          date: r.date.toISOString(),
        })),
        recentPayments: recentPayments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.paymentMethod,
          date: p.paidAt?.toISOString(),
          name: p.groupRegistration?.groupName ||
                (p.individualRegistration ? `${p.individualRegistration.firstName} ${p.individualRegistration.lastName}` : 'Unknown'),
        })),
        trends: {
          today: todayGroupCount + todayIndividualCount,
          thisWeek: thisWeekGroupCount + thisWeekIndividualCount,
          lastWeek: lastWeekGroupCount + lastWeekIndividualCount,
        },
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

    // Debug: Log key fields being saved
    console.log('[PUT Event] 📝 Key fields received:', {
      backgroundImageUrl: data.backgroundImageUrl,
      contactInfo: data.contactInfo,
      confirmationEmailMessage: data.confirmationEmailMessage?.substring(0, 50),
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      faqContent: data.faqContent?.substring(0, 50),
    })

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
              couponsEnabled: data.couponsEnabled || false,
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
              // Option capacity fields (null = unlimited)
              ...(data.onCampusCapacity !== undefined && { onCampusCapacity: data.onCampusCapacity ? parseInt(data.onCampusCapacity) : null }),
              ...(data.onCampusCapacity !== undefined && { onCampusRemaining: data.onCampusCapacity ? parseInt(data.onCampusCapacity) : null }),
              ...(data.offCampusCapacity !== undefined && { offCampusCapacity: data.offCampusCapacity ? parseInt(data.offCampusCapacity) : null }),
              ...(data.offCampusCapacity !== undefined && { offCampusRemaining: data.offCampusCapacity ? parseInt(data.offCampusCapacity) : null }),
              ...(data.dayPassCapacity !== undefined && { dayPassCapacity: data.dayPassCapacity ? parseInt(data.dayPassCapacity) : null }),
              ...(data.dayPassCapacity !== undefined && { dayPassRemaining: data.dayPassCapacity ? parseInt(data.dayPassCapacity) : null }),
              ...(data.singleRoomCapacity !== undefined && { singleRoomCapacity: data.singleRoomCapacity ? parseInt(data.singleRoomCapacity) : null }),
              ...(data.singleRoomCapacity !== undefined && { singleRoomRemaining: data.singleRoomCapacity ? parseInt(data.singleRoomCapacity) : null }),
              ...(data.doubleRoomCapacity !== undefined && { doubleRoomCapacity: data.doubleRoomCapacity ? parseInt(data.doubleRoomCapacity) : null }),
              ...(data.doubleRoomCapacity !== undefined && { doubleRoomRemaining: data.doubleRoomCapacity ? parseInt(data.doubleRoomCapacity) : null }),
              ...(data.tripleRoomCapacity !== undefined && { tripleRoomCapacity: data.tripleRoomCapacity ? parseInt(data.tripleRoomCapacity) : null }),
              ...(data.tripleRoomCapacity !== undefined && { tripleRoomRemaining: data.tripleRoomCapacity ? parseInt(data.tripleRoomCapacity) : null }),
              ...(data.quadRoomCapacity !== undefined && { quadRoomCapacity: data.quadRoomCapacity ? parseInt(data.quadRoomCapacity) : null }),
              ...(data.quadRoomCapacity !== undefined && { quadRoomRemaining: data.quadRoomCapacity ? parseInt(data.quadRoomCapacity) : null }),
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
              contactEmail: data.contactEmail || null,
              contactPhone: data.contactPhone || null,
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
              couponsEnabled: data.couponsEnabled || false,
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
              // Option capacity fields (null = unlimited)
              ...(data.onCampusCapacity !== undefined && { onCampusCapacity: data.onCampusCapacity ? parseInt(data.onCampusCapacity) : null }),
              ...(data.onCampusCapacity !== undefined && { onCampusRemaining: data.onCampusCapacity ? parseInt(data.onCampusCapacity) : null }),
              ...(data.offCampusCapacity !== undefined && { offCampusCapacity: data.offCampusCapacity ? parseInt(data.offCampusCapacity) : null }),
              ...(data.offCampusCapacity !== undefined && { offCampusRemaining: data.offCampusCapacity ? parseInt(data.offCampusCapacity) : null }),
              ...(data.dayPassCapacity !== undefined && { dayPassCapacity: data.dayPassCapacity ? parseInt(data.dayPassCapacity) : null }),
              ...(data.dayPassCapacity !== undefined && { dayPassRemaining: data.dayPassCapacity ? parseInt(data.dayPassCapacity) : null }),
              ...(data.singleRoomCapacity !== undefined && { singleRoomCapacity: data.singleRoomCapacity ? parseInt(data.singleRoomCapacity) : null }),
              ...(data.singleRoomCapacity !== undefined && { singleRoomRemaining: data.singleRoomCapacity ? parseInt(data.singleRoomCapacity) : null }),
              ...(data.doubleRoomCapacity !== undefined && { doubleRoomCapacity: data.doubleRoomCapacity ? parseInt(data.doubleRoomCapacity) : null }),
              ...(data.doubleRoomCapacity !== undefined && { doubleRoomRemaining: data.doubleRoomCapacity ? parseInt(data.doubleRoomCapacity) : null }),
              ...(data.tripleRoomCapacity !== undefined && { tripleRoomCapacity: data.tripleRoomCapacity ? parseInt(data.tripleRoomCapacity) : null }),
              ...(data.tripleRoomCapacity !== undefined && { tripleRoomRemaining: data.tripleRoomCapacity ? parseInt(data.tripleRoomCapacity) : null }),
              ...(data.quadRoomCapacity !== undefined && { quadRoomCapacity: data.quadRoomCapacity ? parseInt(data.quadRoomCapacity) : null }),
              ...(data.quadRoomCapacity !== undefined && { quadRoomRemaining: data.quadRoomCapacity ? parseInt(data.quadRoomCapacity) : null }),
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
              contactEmail: data.contactEmail || null,
              contactPhone: data.contactPhone || null,
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

    // Handle day pass options update
    if (data.dayPassOptions !== undefined && Array.isArray(data.dayPassOptions)) {
      // Get existing day pass options for this event
      const existingOptions = await prisma.dayPassOption.findMany({
        where: { eventId },
        select: { id: true },
      })

      const existingIds = existingOptions.map(opt => opt.id)
      const newOptionIds = data.dayPassOptions
        .filter((opt: { id: string }) => !opt.id.startsWith('temp-'))
        .map((opt: { id: string }) => opt.id)

      // Delete options that are no longer in the list
      const idsToDelete = existingIds.filter(id => !newOptionIds.includes(id))
      if (idsToDelete.length > 0) {
        await prisma.dayPassOption.deleteMany({
          where: { id: { in: idsToDelete } },
        })
      }

      // Update or create day pass options
      for (const option of data.dayPassOptions) {
        if (option.id && !option.id.startsWith('temp-')) {
          // Update existing option (don't update eventId/organizationId as they don't change)
          await prisma.dayPassOption.update({
            where: { id: option.id },
            data: {
              date: new Date(option.date),
              name: option.name || 'Day Pass',
              capacity: option.capacity ? parseInt(option.capacity) : 0,
              remaining: option.capacity ? parseInt(option.capacity) : 0,
              price: option.price ? parseFloat(option.price) : 50,
              youthPrice: option.youthPrice ? parseFloat(option.youthPrice) : null,
              chaperonePrice: option.chaperonePrice ? parseFloat(option.chaperonePrice) : null,
              isActive: option.isActive !== false,
            },
          })
        } else {
          // Create new option
          await prisma.dayPassOption.create({
            data: {
              eventId,
              organizationId: effectiveOrgId!,
              date: new Date(option.date),
              name: option.name || 'Day Pass',
              capacity: option.capacity ? parseInt(option.capacity) : 0,
              remaining: option.capacity ? parseInt(option.capacity) : 0,
              price: option.price ? parseFloat(option.price) : 50,
              youthPrice: option.youthPrice ? parseFloat(option.youthPrice) : null,
              chaperonePrice: option.chaperonePrice ? parseFloat(option.chaperonePrice) : null,
              isActive: option.isActive !== false,
            },
          })
        }
      }
    }

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
