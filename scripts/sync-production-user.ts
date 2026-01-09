/**
 * Sync Production User Script
 *
 * This script creates or updates a user in the database with a production Clerk User ID.
 * Use this when switching from Clerk development to production, as development
 * Clerk User IDs are different from production ones.
 *
 * Usage:
 *   npx tsx scripts/sync-production-user.ts <clerk_user_id> <email> [first_name] [last_name] [role]
 *
 * Examples:
 *   # Create master admin with Clerk ID
 *   npx tsx scripts/sync-production-user.ts user_2abc123xyz admin@example.com John Doe master_admin
 *
 *   # Create org admin
 *   npx tsx scripts/sync-production-user.ts user_2abc123xyz admin@org.com Jane Smith org_admin
 *
 *   # Update existing user's Clerk ID
 *   npx tsx scripts/sync-production-user.ts user_2newid email@example.com
 *
 * How to get your Clerk User ID:
 *   1. Go to https://dashboard.clerk.com
 *   2. Select your PRODUCTION application (not development!)
 *   3. Go to "Users" section
 *   4. Find your user and click on it
 *   5. Copy the "User ID" field (starts with "user_")
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type UserRole = 'master_admin' | 'org_admin' | 'event_manager' | 'finance_manager' | 'staff' | 'poros_coordinator' | 'salve_coordinator' | 'rapha_coordinator' | 'group_leader'

const validRoles: UserRole[] = [
  'master_admin',
  'org_admin',
  'event_manager',
  'finance_manager',
  'staff',
  'poros_coordinator',
  'salve_coordinator',
  'rapha_coordinator',
  'group_leader',
]

async function syncProductionUser() {
  const clerkUserId = process.argv[2]
  const email = process.argv[3]
  const firstName = process.argv[4] || 'User'
  const lastName = process.argv[5] || ''
  const role = (process.argv[6] || 'master_admin') as UserRole

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  SYNC PRODUCTION USER')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Validate inputs
  if (!clerkUserId || !email) {
    console.error('❌ Error: Missing required arguments\n')
    console.log('Usage:')
    console.log('  npx tsx scripts/sync-production-user.ts <clerk_user_id> <email> [first_name] [last_name] [role]\n')
    console.log('Examples:')
    console.log('  npx tsx scripts/sync-production-user.ts user_2abc123 admin@example.com John Doe master_admin')
    console.log('  npx tsx scripts/sync-production-user.ts user_2abc123 admin@example.com\n')
    console.log('How to get your Clerk User ID:')
    console.log('  1. Go to https://dashboard.clerk.com')
    console.log('  2. Select your PRODUCTION application')
    console.log('  3. Go to "Users" section')
    console.log('  4. Click on your user')
    console.log('  5. Copy the "User ID" (starts with "user_")\n')
    process.exit(1)
  }

  if (!clerkUserId.startsWith('user_')) {
    console.error('❌ Error: Clerk User ID must start with "user_"')
    console.error(`   Got: ${clerkUserId}`)
    console.error('   Expected format: user_xxxxxxxxxxxxxxxxxxxx\n')
    process.exit(1)
  }

  if (!validRoles.includes(role)) {
    console.error(`❌ Error: Invalid role "${role}"`)
    console.error(`   Valid roles: ${validRoles.join(', ')}\n`)
    process.exit(1)
  }

  console.log('📋 Input Parameters:')
  console.log(`   Clerk User ID: ${clerkUserId}`)
  console.log(`   Email:         ${email}`)
  console.log(`   Name:          ${firstName} ${lastName}`)
  console.log(`   Role:          ${role}\n`)

  try {
    // Check if a user already exists with this Clerk ID
    const existingByClerkId = await prisma.user.findFirst({
      where: { clerkUserId },
    })

    if (existingByClerkId) {
      console.log('⚠️  User already exists with this Clerk ID:')
      console.log(`   Database ID: ${existingByClerkId.id}`)
      console.log(`   Email:       ${existingByClerkId.email}`)
      console.log(`   Role:        ${existingByClerkId.role}`)
      console.log(`   Clerk ID:    ${existingByClerkId.clerkUserId}\n`)

      // Update the user if role is different
      if (existingByClerkId.role !== role) {
        const updated = await prisma.user.update({
          where: { id: existingByClerkId.id },
          data: {
            role,
            email,
            firstName,
            lastName,
            updatedAt: new Date(),
          },
        })
        console.log('✅ Updated user role and info:')
        console.log(`   New Role: ${updated.role}\n`)
      } else {
        console.log('✅ No changes needed - user already configured correctly\n')
      }

      await prisma.$disconnect()
      return
    }

    // Check if a user exists with this email (but no Clerk ID or different Clerk ID)
    const existingByEmail = await prisma.user.findFirst({
      where: { email },
    })

    if (existingByEmail) {
      console.log('📝 Found existing user by email:')
      console.log(`   Database ID: ${existingByEmail.id}`)
      console.log(`   Current Clerk ID: ${existingByEmail.clerkUserId || '(none)'}`)
      console.log(`   Current Role: ${existingByEmail.role}\n`)

      // Update the existing user with the new Clerk ID
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          clerkUserId,
          role,
          firstName,
          lastName,
          updatedAt: new Date(),
        },
      })

      console.log('✅ Updated user with production Clerk ID:')
      console.log(`   Database ID: ${updated.id}`)
      console.log(`   Email:       ${updated.email}`)
      console.log(`   Role:        ${updated.role}`)
      console.log(`   Clerk ID:    ${updated.clerkUserId}\n`)
    } else {
      // Create new user
      const created = await prisma.user.create({
        data: {
          clerkUserId,
          email,
          firstName,
          lastName,
          role,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      console.log('✅ Created new user:')
      console.log(`   Database ID: ${created.id}`)
      console.log(`   Email:       ${created.email}`)
      console.log(`   Name:        ${created.firstName} ${created.lastName}`)
      console.log(`   Role:        ${created.role}`)
      console.log(`   Clerk ID:    ${created.clerkUserId}\n`)
    }

    // Provide next steps based on role
    console.log('═══════════════════════════════════════════════════════════')
    console.log('  NEXT STEPS')
    console.log('═══════════════════════════════════════════════════════════\n')

    if (role === 'master_admin') {
      console.log('🎉 Master Admin Setup Complete!\n')
      console.log('You can now:')
      console.log('  1. Go to https://chirhoevents.com/sign-in')
      console.log('  2. Sign in with your Clerk account')
      console.log('  3. You should be redirected to /dashboard/master-admin\n')
    } else if (role === 'org_admin') {
      console.log('🎉 Org Admin Setup Complete!\n')
      console.log('Note: This user needs to be assigned to an organization.')
      console.log('Run the following to assign an organization:\n')
      console.log('  npx tsx scripts/assign-user-to-org.ts <user_email> <org_slug>\n')
    } else {
      console.log('🎉 User Setup Complete!\n')
      console.log('The user can now sign in at https://chirhoevents.com/sign-in\n')
    }

  } catch (error) {
    console.error('❌ Error syncing user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncProductionUser()
