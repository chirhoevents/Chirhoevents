/**
 * Seed script for email forwards configuration
 *
 * Run with: npx tsx prisma/seed-email-forwards.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedEmailForwards() {
  console.log('🌱 Seeding email forwards...')

  // Support email - main support channel
  await prisma.emailForward.upsert({
    where: { fromAddress: 'support@chirhoevents.com' },
    update: {},
    create: {
      fromAddress: 'support@chirhoevents.com',
      forwardTo: [], // Add your personal/team emails here
      createTicket: true,
      autoReply: true,
      autoReplyText: `Thank you for contacting ChiRho Events support!

We've received your message and will respond within 24 hours during business hours.

If this is urgent, please call us directly.

Best regards,
ChiRho Events Support Team`,
    },
  })
  console.log('  ✅ support@chirhoevents.com configured')

  // Info email - general inquiries
  await prisma.emailForward.upsert({
    where: { fromAddress: 'info@chirhoevents.com' },
    update: {},
    create: {
      fromAddress: 'info@chirhoevents.com',
      forwardTo: [],
      createTicket: true,
      autoReply: true,
      autoReplyText: `Thank you for your interest in ChiRho Events!

We've received your inquiry and will respond soon.

In the meantime, feel free to explore our website at chirhoevents.com.

Best regards,
ChiRho Events Team`,
    },
  })
  console.log('  ✅ info@chirhoevents.com configured')

  // Legal email - legal matters (no auto-reply)
  await prisma.emailForward.upsert({
    where: { fromAddress: 'legal@chirhoevents.com' },
    update: {},
    create: {
      fromAddress: 'legal@chirhoevents.com',
      forwardTo: [],
      createTicket: true,
      autoReply: false, // No auto-reply for legal matters
    },
  })
  console.log('  ✅ legal@chirhoevents.com configured')

  // Privacy email - privacy/GDPR requests (no auto-reply)
  await prisma.emailForward.upsert({
    where: { fromAddress: 'privacy@chirhoevents.com' },
    update: {},
    create: {
      fromAddress: 'privacy@chirhoevents.com',
      forwardTo: [],
      createTicket: true,
      autoReply: false, // No auto-reply for privacy matters
    },
  })
  console.log('  ✅ privacy@chirhoevents.com configured')

  // Billing email
  await prisma.emailForward.upsert({
    where: { fromAddress: 'billing@chirhoevents.com' },
    update: {},
    create: {
      fromAddress: 'billing@chirhoevents.com',
      forwardTo: [],
      createTicket: true,
      autoReply: true,
      autoReplyText: `Thank you for contacting ChiRho Events billing!

We've received your billing inquiry and will respond within 1-2 business days.

For immediate assistance with payments, you can log into your dashboard at chirhoevents.com.

Best regards,
ChiRho Events Billing Team`,
    },
  })
  console.log('  ✅ billing@chirhoevents.com configured')

  console.log('\n✅ Email forwards seeded successfully!')
  console.log('\n📝 Next steps:')
  console.log('   1. Update forwardTo arrays with your actual email addresses')
  console.log('   2. Configure Resend inbound webhook at https://resend.com/webhooks')
  console.log('   3. Add RESEND_WEBHOOK_SECRET to your environment variables')
}

seedEmailForwards()
  .catch((error) => {
    console.error('❌ Error seeding email forwards:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
