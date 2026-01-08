/**
 * Setup Master Admin Script
 *
 * This script sets up a master admin user in the database.
 * Run with: npx tsx scripts/setup-master-admin.ts YOUR_EMAIL
 *
 * Example: npx tsx scripts/setup-master-admin.ts juanito@chirhoevents.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupMasterAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ Please provide an email address')
    console.error('Usage: npx tsx scripts/setup-master-admin.ts YOUR_EMAIL')
    process.exit(1)
  }

  console.log(`\n🔧 Setting up master admin for: ${email}\n`)

  try {
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      // Update existing user to master_admin
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'master_admin' },
      })
      console.log('✅ Updated existing user to master_admin')
      console.log(`   ID: ${updated.id}`)
      console.log(`   Email: ${updated.email}`)
      console.log(`   Role: ${updated.role}`)
      console.log(`   Clerk ID: ${updated.clerkUserId || 'Not linked yet'}`)
    } else {
      // Create new user as master_admin (without Clerk ID - will be linked on sign-in)
      const created = await prisma.user.create({
        data: {
          email,
          firstName: 'Master',
          lastName: 'Admin',
          role: 'master_admin',
        },
      })
      console.log('✅ Created new master_admin user')
      console.log(`   ID: ${created.id}`)
      console.log(`   Email: ${created.email}`)
      console.log(`   Role: ${created.role}`)
      console.log('\n⚠️  Note: Sign in with this email to link your Clerk account')
    }

    console.log('\n🎉 Master admin setup complete!')
    console.log('   You can now sign in at: /sign-in?portal=master-admin\n')

  } catch (error) {
    console.error('❌ Error setting up master admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupMasterAdmin()
