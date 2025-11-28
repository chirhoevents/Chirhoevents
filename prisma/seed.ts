-- ChiRho Events - Seed Data
-- Test Event: Mount 2000 Summer 2026

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create test organization
  const org = await prisma.organization.upsert({
    where: { contactEmail: 'admin@mount2000.org' },
    update: {},
    create: {
      name: 'Mount 2000',
      type: 'retreat_center',
      contactName: 'Mount 2000 Admin',
      contactEmail: 'admin@mount2000.org',
      contactPhone: '(555) 123-4567',
      subscriptionTier: 'conference',
      subscriptionStatus: 'active',
      monthlyFee: 149.00,
      setupFeePaid: true,
      storageLimitGb: 40,
      eventsPerYearLimit: 10,
    },
  })

  console.log('✅ Created organization:', org.name)

  // Create test admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mount2000.org' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@mount2000.org',
      firstName: 'Mount',
      lastName: 'Admin',
      role: 'org_admin',
      phone: '(555) 123-4567',
    },
  })

  console.log('✅ Created admin user:', admin.email)

  // Create test event
  const event = await prisma.event.upsert({
    where: { slug: 'mount2000-summer-2026' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Mount 2000 Summer 2026',
      slug: 'mount2000-summer-2026',
      description: 'Join us for an incredible week of faith, fellowship, and fun at Mount 2000 Summer 2026!',
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-07-13'),
      timezone: 'America/New_York',
      locationName: 'Mount Saint Mary Seminary',
      capacityTotal: 5000,
      capacityRemaining: 5000,
      registrationOpenDate: new Date('2026-03-01T00:00:00Z'),
      registrationCloseDate: new Date('2026-07-01T23:59:59Z'),
      status: 'registration_open',
      createdBy: admin.id,
    },
  })

  console.log('✅ Created event:', event.name)

  // Create event settings
  await prisma.eventSettings.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      groupRegistrationEnabled: true,
      individualRegistrationEnabled: true,
      liabilityFormsRequiredGroup: true,
      showDietaryRestrictions: true,
      showAdaAccommodations: true,
    },
  })

  console.log('✅ Created event settings')

  // Create event pricing
  await prisma.eventPricing.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      youthRegularPrice: 100.00,
      chaperoneRegularPrice: 75.00,
      priestPrice: 0.00,
      depositAmount: 25.00, // 25% deposit
      depositPerPerson: true,
      earlyBirdDeadline: new Date('2026-05-01T23:59:59Z'),
      regularDeadline: new Date('2026-06-15T23:59:59Z'),
      fullPaymentDeadline: new Date('2026-07-01T23:59:59Z'),
      currency: 'USD',
    },
  })

  console.log('✅ Created event pricing')
  console.log('🎉 Seed completed successfully!')
  console.log(`\n📋 Test Event Details:`)
  console.log(`   Event ID: ${event.id}`)
  console.log(`   Event Slug: ${event.slug}`)
  console.log(`   Registration URL: /events/${event.id}/register-group`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
