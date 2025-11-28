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

  // 4. Create event settings (enable all features)
  await prisma.eventSettings.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      groupRegistrationEnabled: true,
      individualRegistrationEnabled: true,
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
  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Your Test Data:')
  console.log('─'.repeat(60))
  console.log(`Organization: ${org.name}`)
  console.log(`Org Admin Email: ${admin.email}`)
  console.log(`Org Admin Role: ${admin.role}`)
  console.log(`\nEvent: ${event.name}`)
  console.log(`Event Slug: ${event.slug}`)
  console.log(`Event ID: ${event.id}`)
  console.log(`\nRegistration URL:`)
  console.log(`  https://chirhoevents.com/events/${event.id}/register-group`)
  console.log('\n📊 Pricing:')
  console.log(`  Early Bird Youth: $90.00 (until May 1, 2026)`)
  console.log(`  Regular Youth: $100.00`)
  console.log(`  Late Youth: $120.00 (after June 15, 2026)`)
  console.log(`  Chaperones: $75.00`)
  console.log(`  Priests: FREE`)
  console.log(`  Deposit Required: 25%`)
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
