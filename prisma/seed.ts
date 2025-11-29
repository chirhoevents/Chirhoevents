// ChiRho Events - Seed Data
// Mount Saint Mary Seminary Test Data

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

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
      monthlyFee: 149.00,
      setupFeePaid: true,
      storageLimitGb: 40,
      eventsPerYearLimit: 10,
    },
  })

  console.log('✅ Created organization:', org.name)

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

  console.log('✅ Created org admin user:', admin.email)

  // 3. Create Mount 2000 Summer 2026 event
  const event = await prisma.event.upsert({
    where: { slug: 'mount2000-2026' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Mount 2000 Summer 2026',
      slug: 'mount2000-2026',
      description: 'An incredible week of faith, fellowship, and fun for Catholic youth! Join us at the Mount for a life-changing experience.',
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
      registrationOpenDate: new Date('2026-03-01T00:00:00Z'),
      registrationCloseDate: new Date('2026-07-08T23:59:59Z'),
      status: 'registration_open',
      createdBy: admin.id,
    },
  })

  console.log('✅ Created event:', event.name)

  // 3b. Create Krygma Retreat 2027 (Individual Registration Test Event)
  const krygmaEvent = await prisma.event.upsert({
    where: { slug: 'krygma-retreat-2027' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Krygma Retreat 2027',
      slug: 'krygma-retreat-2027',
      description: 'A powerful retreat experience focused on encountering Christ through the Kerygma - the essential proclamation of the Gospel.',
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
      registrationOpenDate: new Date('2026-11-01T00:00:00Z'),
      registrationCloseDate: new Date('2027-03-10T23:59:59Z'),
      status: 'registration_open',
      createdBy: admin.id,
    },
  })

  console.log('✅ Created event:', krygmaEvent.name)

  // 4. Create event settings (GROUP REGISTRATION ONLY)
  await prisma.eventSettings.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      groupRegistrationEnabled: true,
      individualRegistrationEnabled: false, // GROUP ONLY - not individual
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

  console.log('✅ Created event settings (all features enabled)')

  // 4b. Create Krygma Retreat event settings
  await prisma.eventSettings.upsert({
    where: { eventId: krygmaEvent.id },
    update: {},
    create: {
      eventId: krygmaEvent.id,
      groupRegistrationEnabled: false, // Individual registration only
      individualRegistrationEnabled: true,
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
      registrationInstructions: 'Welcome to Krygma Retreat 2027! We\'re excited to have you join us for this powerful weekend of faith formation.',
    },
  })

  console.log('✅ Created Krygma Retreat event settings')

  // 5. Create event pricing
  await prisma.eventPricing.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      youthEarlyBirdPrice: 90.00,
      youthRegularPrice: 100.00,
      youthLatePrice: 120.00,
      chaperoneEarlyBirdPrice: 65.00,
      chaperoneRegularPrice: 75.00,
      chaperoneLatePrice: 90.00,
      priestPrice: 0.00,
      onCampusYouthPrice: 100.00,
      offCampusYouthPrice: 75.00,
      dayPassYouthPrice: 50.00,
      onCampusChaperonePrice: 75.00,
      offCampusChaperonePrice: 60.00,
      dayPassChaperonePrice: 40.00,
      depositAmount: 25.00, // 25% deposit
      depositPerPerson: true,
      earlyBirdDeadline: new Date('2026-05-01T23:59:59Z'),
      regularDeadline: new Date('2026-06-15T23:59:59Z'),
      fullPaymentDeadline: new Date('2026-07-01T23:59:59Z'),
      lateFeePercentage: 20.00,
      lateFeeAutoApply: false,
      currency: 'USD',
    },
  })

  console.log('✅ Created event pricing')

  // 5b. Create Krygma Retreat pricing (Individual registration focused)
  await prisma.eventPricing.upsert({
    where: { eventId: krygmaEvent.id },
    update: {},
    create: {
      eventId: krygmaEvent.id,
      youthEarlyBirdPrice: 0.00, // Not used for individual-only events
      youthRegularPrice: 150.00, // Default individual price
      youthLatePrice: 0.00,
      chaperoneEarlyBirdPrice: 0.00,
      chaperoneRegularPrice: 0.00,
      chaperoneLatePrice: 0.00,
      priestPrice: 0.00,
      onCampusYouthPrice: 150.00,
      offCampusYouthPrice: 100.00,
      dayPassYouthPrice: 75.00,
      onCampusChaperonePrice: null,
      offCampusChaperonePrice: null,
      dayPassChaperonePrice: null,
      depositAmount: null,
      depositPerPerson: false,
      requireFullPayment: true, // Full payment required for individuals
      earlyBirdDeadline: null,
      regularDeadline: null,
      fullPaymentDeadline: new Date('2027-03-10T23:59:59Z'),
      lateFeePercentage: 0.00,
      lateFeeAutoApply: false,
      currency: 'USD',
    },
  })

  console.log('✅ Created Krygma Retreat pricing')
  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Your Test Data:')
  console.log('─'.repeat(60))
  console.log(`Organization: ${org.name}`)
  console.log(`Org Admin Email: ${admin.email}`)
  console.log(`Org Admin Role: ${admin.role}`)
  console.log(`\n🔹 Event 1: ${event.name} (Group Registration Only)`)
  console.log(`Event Slug: ${event.slug}`)
  console.log(`Event ID: ${event.id}`)
  console.log(`\nRegistration URL:`)
  console.log(`  Group: https://chirhoevents.com/events/${event.id}/register-group`)

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\n🔹 Event 2: ${krygmaEvent.name} (Individual Registration Only)`)
  console.log(`Event Slug: ${krygmaEvent.slug}`)
  console.log(`Event ID: ${krygmaEvent.id}`)
  console.log(`\nRegistration URL:`)
  console.log(`  Individual: https://chirhoevents.com/events/${krygmaEvent.id}/register-individual`)
  console.log('\n📊 Pricing:')
  console.log(`  Early Bird Youth: $90.00 (until May 1, 2026)`)
  console.log(`  Regular Youth: $100.00`)
  console.log(`  Late Youth: $120.00 (after June 15, 2026)`)
  console.log(`  Chaperones: $75.00`)
  console.log(`  Priests: FREE`)
  console.log(`\n🏠 Housing Type Pricing:`)
  console.log(`  On-Campus Youth: $100.00 | Chaperones: $75.00`)
  console.log(`  Off-Campus Youth: $75.00 | Chaperones: $60.00`)
  console.log(`  Day-Pass Youth: $50.00 | Chaperones: $40.00`)
  console.log(`\n💰 Deposit Required: $25.00 per person`)

  console.log(`\n📊 Krygma Retreat Pricing (Individual Only):`)
  console.log(`  On-Campus: $150.00`)
  console.log(`  Off-Campus: $100.00`)
  console.log(`  Day-Pass: $75.00`)
  console.log(`\n💰 Full Payment Required (No deposit option)`)
  console.log('─'.repeat(60))
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
