import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission - allow all admin roles
    const adminRoles = ['org_admin', 'master_admin', 'event_manager', 'poros_coordinator', 'registration_manager']
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const { eventId } = await Promise.resolve(params)
    const body = await request.json()

    // Verify event belongs to user's organization (without including settings to avoid schema issues)
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: organizationId },
      select: { id: true },
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
    let settings
    try {
      settings = await prisma.eventSettings.upsert({
        where: { eventId },
        update: updateData,
        create: {
          eventId,
          ...updateData,
        },
      })
    } catch (upsertError) {
      console.error('Error upserting settings:', upsertError)
      // Try a simple update if upsert fails
      try {
        settings = await prisma.eventSettings.update({
          where: { eventId },
          data: updateData,
        })
      } catch (updateError) {
        // Settings might not exist, try creating
        console.error('Update failed, trying create:', updateError)
        settings = await prisma.eventSettings.create({
          data: {
            eventId,
            ...updateData,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Error updating event settings:', error)
    return NextResponse.json(
      { error: 'Failed to update event settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
