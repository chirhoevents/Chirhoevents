import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// List of all valid settings fields that can be updated
const VALID_SETTINGS_FIELDS = [
  'groupRegistrationEnabled',
  'individualRegistrationEnabled',
  'liabilityFormsRequiredGroup',
  'liabilityFormsRequiredIndividual',
  'showDietaryRestrictions',
  'dietaryRestrictionsRequired',
  'showAdaAccommodations',
  'adaAccommodationsRequired',
  'porosHousingEnabled',
  'porosPriestHousingEnabled',
  'porosSeatingEnabled',
  'porosMealColorsEnabled',
  'porosSmallGroupEnabled',
  'porosSglEnabled',
  'porosSeminarianEnabled',
  'porosReligiousStaffEnabled',
  'porosAdaEnabled',
  'porosPublicPortalEnabled',
  'publicPortalEnabled',
  'salveCheckinEnabled',
  'raphaMedicalEnabled',
  'tshirtsEnabled',
  'individualMealsEnabled',
  'registrationInstructions',
  'checkPaymentEnabled',
  'checkPaymentPayableTo',
  'checkPaymentAddress',
  'allowOnCampus',
  'allowOffCampus',
  'allowDayPass',
  'allowSingleRoom',
  'allowDoubleRoom',
  'allowTripleRoom',
  'allowQuadRoom',
  'singleRoomLabel',
  'doubleRoomLabel',
  'tripleRoomLabel',
  'quadRoomLabel',
  'landingPageShowPrice',
  'landingPageShowSchedule',
  'landingPageShowFaq',
  'landingPageShowIncluded',
  'landingPageShowBring',
  'landingPageShowContact',
  'landingPageShowGallery',
  'landingPageShowSponsors',
  'showAvailability',
  'availabilityThreshold',
  'countdownLocation',
  'countdownBeforeOpen',
  'countdownBeforeClose',
  'backgroundImageUrl',
  'primaryColor',
  'secondaryColor',
  'overlayColor',
  'overlayOpacity',
  'waitlistEnabled',
  'registrationClosedMessage',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
    })

    if (!user || !['org_admin', 'master_admin', 'event_manager', 'poros_coordinator'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { eventId } = await Promise.resolve(params)
    const body = await request.json()

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: user.organizationId },
      include: { settings: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Filter body to only include valid settings fields
    const updateData: Record<string, any> = {}
    for (const key of Object.keys(body)) {
      if (VALID_SETTINGS_FIELDS.includes(key) && body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update or create event settings
    const settings = await prisma.eventSettings.upsert({
      where: { eventId },
      update: updateData,
      create: {
        eventId,
        ...updateData,
      },
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Error updating event settings:', error)
    return NextResponse.json(
      { error: 'Failed to update event settings' },
      { status: 500 }
    )
  }
}
