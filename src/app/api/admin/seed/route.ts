import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// CORS headers for local HTML file access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Admin API Endpoint to Seed Database
 * POST /api/admin/seed
 *
 * This endpoint runs the seed script to create test data
 * Required: secret key for security
 */
export async function POST(request: NextRequest) {
  try {
    // Security check - require secret key
    const { secret } = await request.json()

    if (secret !== process.env.SEED_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid secret key' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Run seed logic
    console.log('🌱 Starting seed via API...')

    // 1. Create Mount Saint Mary Seminary organization
    const org = await prisma.organization.upsert({
      where: { contactEmail: 'juanito@msmary.edu' },
      update: {},
      create: {
        name: 'Mount Saint Mary Seminary',
        type: 'seminary',
        contactName: 'Juanito',
        contactEmail: 'juanito@msmary.edu',
        contactPhone: '(301) 447-5295',
        subscriptionTier: 'growing',
        subscriptionStatus: 'active',
        monthlyFee: 149.0,
        setupFeePaid: true,
        storageLimitGb: 40,
        eventsPerYearLimit: 10,
      },
    })

    // 2. Create Org Admin user (Juanito)
    const admin = await prisma.user.upsert({
      where: { email: 'juanito@msmary.edu' },
      update: {},
      create: {
        organizationId: org.id,
        email: 'juanito@msmary.edu',
        firstName: 'Juanito',
        lastName: 'Admin',
        role: 'org_admin',
        phone: '(301) 447-5295',
      },
    })

    // 3. Create Mount 2000 Summer 2026 event
    const event = await prisma.event.upsert({
      where: { slug: 'mount2000-2026' },
      update: {},
      create: {
        organizationId: org.id,
        name: 'Mount 2000 Summer 2026',
        slug: 'mount2000-2026',
        description:
          'An incredible week of faith, fellowship, and fun for Catholic youth! Join us at the Mount for a life-changing experience.',
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-13'),
        timezone: 'America/New_York',
        locationName: "Mount St. Mary's University",
        locationAddress: {
          street: '16300 Old Emmitsburg Road',
          city: 'Emmitsburg',
          state: 'MD',
          zip: '21727',
          country: 'USA',
        },
        capacityTotal: 1000,
        capacityRemaining: 1000,
        registrationOpenDate: new Date('2025-01-01T00:00:00Z'),
        registrationCloseDate: new Date('2026-07-08T23:59:59Z'),
        status: 'registration_open',
        createdBy: admin.id,
      },
    })

    // 4. Create Krygma Retreat 2027 event
    const krygmaEvent = await prisma.event.upsert({
      where: { slug: 'krygma-retreat-2027' },
      update: {},
      create: {
        organizationId: org.id,
        name: 'Krygma Retreat 2027',
        slug: 'krygma-retreat-2027',
        description:
          'A powerful retreat experience focused on encountering Christ through the Kerygma - the essential proclamation of the Gospel.',
        startDate: new Date('2027-03-12'),
        endDate: new Date('2027-03-14'),
        timezone: 'America/New_York',
        locationName: "Mount St. Mary's University",
        locationAddress: {
          street: '16300 Old Emmitsburg Road',
          city: 'Emmitsburg',
          state: 'MD',
          zip: '21727',
          country: 'USA',
        },
        capacityTotal: 200,
        capacityRemaining: 200,
        registrationOpenDate: new Date('2025-01-01T00:00:00Z'),
        registrationCloseDate: new Date('2027-03-10T23:59:59Z'),
        status: 'registration_open',
        createdBy: admin.id,
      },
    })

    // 5. Create Mount 2000 event settings (GROUP ONLY)
    await prisma.eventSettings.upsert({
      where: { eventId: event.id },
      update: {},
      create: {
        eventId: event.id,
        groupRegistrationEnabled: true,
        individualRegistrationEnabled: false, // GROUP ONLY
        liabilityFormsRequiredGroup: true,
        liabilityFormsRequiredIndividual: true,
        showDietaryRestrictions: true,
        dietaryRestrictionsRequired: false,
        showAdaAccommodations: true,
        adaAccommodationsRequired: false,
        porosHousingEnabled: true,
        porosPriestHousingEnabled: true,
        porosSeatingEnabled: true,
        porosMealColorsEnabled: true,
        porosSmallGroupEnabled: true,
        porosSglEnabled: true,
        porosSeminarianEnabled: true,
        porosReligiousStaffEnabled: true,
        porosAdaEnabled: true,
        publicPortalEnabled: true,
        salveCheckinEnabled: true,
        raphaMedicalEnabled: true,
      },
    })

    // 6. Create Krygma Retreat event settings (INDIVIDUAL ONLY)
    await prisma.eventSettings.upsert({
      where: { eventId: krygmaEvent.id },
      update: {},
      create: {
        eventId: krygmaEvent.id,
        groupRegistrationEnabled: false,
        individualRegistrationEnabled: true, // INDIVIDUAL ONLY
        liabilityFormsRequiredGroup: false,
        liabilityFormsRequiredIndividual: true,
        showDietaryRestrictions: true,
        dietaryRestrictionsRequired: false,
        showAdaAccommodations: true,
        adaAccommodationsRequired: false,
        porosHousingEnabled: true,
        porosPriestHousingEnabled: false,
        porosSeatingEnabled: false,
        porosMealColorsEnabled: false,
        porosSmallGroupEnabled: true,
        porosSglEnabled: false,
        porosSeminarianEnabled: false,
        porosReligiousStaffEnabled: false,
        porosAdaEnabled: true,
        publicPortalEnabled: false,
        salveCheckinEnabled: true,
        raphaMedicalEnabled: true,
        checkPaymentEnabled: true,
        checkPaymentPayableTo: 'Mount Saint Mary Seminary',
        checkPaymentAddress: '16300 Old Emmitsburg Road\nEmmitsburg, MD 21727',
        registrationInstructions:
          "Welcome to Krygma Retreat 2027! We're excited to have you join us for this powerful weekend of faith formation.",
      },
    })

    // 7. Create Mount 2000 event pricing
    await prisma.eventPricing.upsert({
      where: { eventId: event.id },
      update: {},
      create: {
        eventId: event.id,
        youthEarlyBirdPrice: 90.0,
        youthRegularPrice: 100.0,
        youthLatePrice: 120.0,
        chaperoneEarlyBirdPrice: 65.0,
        chaperoneRegularPrice: 75.0,
        chaperoneLatePrice: 90.0,
        priestPrice: 0.0,
        onCampusYouthPrice: 100.0,
        offCampusYouthPrice: 75.0,
        dayPassYouthPrice: 50.0,
        onCampusChaperonePrice: 75.0,
        offCampusChaperonePrice: 60.0,
        dayPassChaperonePrice: 40.0,
        depositAmount: 25.0,
        depositPerPerson: true,
        earlyBirdDeadline: new Date('2026-05-01T23:59:59Z'),
        regularDeadline: new Date('2026-06-15T23:59:59Z'),
        fullPaymentDeadline: new Date('2026-07-01T23:59:59Z'),
        lateFeePercentage: 20.0,
        lateFeeAutoApply: false,
        currency: 'USD',
      },
    })

    // 8. Create Krygma Retreat pricing (INDIVIDUAL ONLY)
    await prisma.eventPricing.upsert({
      where: { eventId: krygmaEvent.id },
      update: {},
      create: {
        eventId: krygmaEvent.id,
        youthEarlyBirdPrice: 0.0,
        youthRegularPrice: 150.0,
        youthLatePrice: 0.0,
        chaperoneEarlyBirdPrice: 0.0,
        chaperoneRegularPrice: 0.0,
        chaperoneLatePrice: 0.0,
        priestPrice: 0.0,
        onCampusYouthPrice: 150.0,
        offCampusYouthPrice: 100.0,
        dayPassYouthPrice: 75.0,
        onCampusChaperonePrice: null,
        offCampusChaperonePrice: null,
        dayPassChaperonePrice: null,
        depositAmount: null,
        depositPerPerson: false,
        requireFullPayment: true,
        earlyBirdDeadline: null,
        regularDeadline: null,
        fullPaymentDeadline: new Date('2027-03-10T23:59:59Z'),
        lateFeePercentage: 0.0,
        lateFeeAutoApply: false,
        currency: 'USD',
      },
    })

    console.log('✅ Seed completed successfully via API!')

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        organization: {
          id: org.id,
          name: org.name,
        },
        events: [
          {
            id: event.id,
            name: event.name,
            slug: event.slug,
            type: 'GROUP REGISTRATION ONLY',
            registrationUrl: `https://chirhoevents.com/events/${event.id}/register-group`,
          },
          {
            id: krygmaEvent.id,
            name: krygmaEvent.name,
            slug: krygmaEvent.slug,
            type: 'INDIVIDUAL REGISTRATION ONLY',
            registrationUrl: `https://chirhoevents.com/events/${krygmaEvent.id}/register-individual`,
          },
        ],
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('❌ Seed failed:', error)
    return NextResponse.json(
      {
        error: 'Seed failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    )
  } finally {
    await prisma.$disconnect()
  }
}
