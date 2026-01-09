/**
 * Fix Organization Structure Script
 *
 * This script fixes the multi-tenant organization structure after Clerk production migration.
 *
 * Current issue:
 * - All events were moved to Saint Josephs Old Cathedral
 * - Events should be in Chirhotestevents (test organization)
 *
 * Expected structure:
 * - Master Admin (17juangalindo@gmail.com): Can access all organizations
 * - Test Org (Chirhotestevents): chirhoevents@gmail.com as org_admin, contains test events
 * - Production Org (Saint Josephs Old Cathedral): juanitohola13@gmail.com as org_admin
 *
 * Usage:
 *   npx tsx scripts/fix-org-structure.ts --dry-run   # Preview changes
 *   npx tsx scripts/fix-org-structure.ts             # Apply changes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  FIX ORGANIZATION STRUCTURE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE (changes will be applied)'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Step 1: Show current state
  console.log('📊 CURRENT DATABASE STATE\n')
  console.log('─── Organizations ───')

  const orgs = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, status: true },
  })

  for (const org of orgs) {
    console.log(`  [${org.id}]`)
    console.log(`    Name:   ${org.name}`)
    console.log(`    Status: ${org.status}`)
    console.log('')
  }

  console.log('─── Users ───')

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['17juangalindo@gmail.com', 'chirhoevents@gmail.com', 'juanitohola13@gmail.com'],
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      organizationId: true,
      clerkUserId: true,
      organization: {
        select: { name: true },
      },
    },
  })

  for (const user of users) {
    console.log(`  [${user.email}]`)
    console.log(`    Database ID: ${user.id}`)
    console.log(`    Name:        ${user.firstName} ${user.lastName}`)
    console.log(`    Role:        ${user.role}`)
    console.log(`    Org:         ${user.organization?.name || 'NONE'} (${user.organizationId || 'null'})`)
    console.log(`    Clerk ID:    ${user.clerkUserId || 'NONE'}`)
    console.log('')
  }

  console.log('─── Events ───')

  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      organizationId: true,
      organization: {
        select: { name: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  for (const event of events) {
    console.log(`  [${event.name}]`)
    console.log(`    Slug:   ${event.slug}`)
    console.log(`    Status: ${event.status}`)
    console.log(`    Org:    ${event.organization?.name || 'NONE'} (${event.organizationId})`)
    console.log('')
  }

  // Step 2: Find the organizations
  const testOrg = orgs.find(o => o.name.toLowerCase().includes('chirhotest'))
  const prodOrg = orgs.find(o => o.name.toLowerCase().includes('saint joseph'))

  if (!testOrg) {
    console.error('❌ Could not find Chirhotestevents organization!')
    console.log('   Available organizations:', orgs.map(o => o.name).join(', '))
    process.exit(1)
  }

  if (!prodOrg) {
    console.log('⚠️  Could not find Saint Josephs organization (might not exist yet)')
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  PLANNED CHANGES')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Step 3: Plan changes
  const changes: string[] = []

  // Move all events to test org
  const eventsToMove = events.filter(e => e.organizationId !== testOrg.id)
  if (eventsToMove.length > 0) {
    changes.push(`Move ${eventsToMove.length} events to ${testOrg.name}:`)
    for (const event of eventsToMove) {
      changes.push(`  - ${event.name} (from ${event.organization?.name || 'unknown'})`)
    }
  }

  // Ensure chirhoevents@gmail.com is in test org
  const testOrgAdmin = users.find(u => u.email === 'chirhoevents@gmail.com')
  if (testOrgAdmin && testOrgAdmin.organizationId !== testOrg.id) {
    changes.push(`\nAssign chirhoevents@gmail.com to ${testOrg.name}`)
  }

  // Ensure juanitohola13@gmail.com is in prod org (if prod org exists)
  const prodOrgAdmin = users.find(u => u.email === 'juanitohola13@gmail.com')
  if (prodOrg && prodOrgAdmin && prodOrgAdmin.organizationId !== prodOrg.id) {
    changes.push(`\nAssign juanitohola13@gmail.com to ${prodOrg.name}`)
  }

  if (changes.length === 0) {
    console.log('✅ No changes needed - database structure is correct!\n')
    await prisma.$disconnect()
    return
  }

  for (const change of changes) {
    console.log(change)
  }

  if (DRY_RUN) {
    console.log('\n════════════════════════════════════════════════════════════')
    console.log('  DRY RUN COMPLETE - No changes were made')
    console.log('  Run without --dry-run to apply these changes')
    console.log('════════════════════════════════════════════════════════════\n')
    await prisma.$disconnect()
    return
  }

  // Step 4: Apply changes
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  APPLYING CHANGES...')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Move events to test org
  if (eventsToMove.length > 0) {
    await prisma.event.updateMany({
      where: {
        id: { in: eventsToMove.map(e => e.id) },
      },
      data: {
        organizationId: testOrg.id,
      },
    })
    console.log(`✅ Moved ${eventsToMove.length} events to ${testOrg.name}`)
  }

  // Assign chirhoevents@gmail.com to test org
  if (testOrgAdmin && testOrgAdmin.organizationId !== testOrg.id) {
    await prisma.user.update({
      where: { id: testOrgAdmin.id },
      data: {
        organizationId: testOrg.id,
        role: 'org_admin',
      },
    })
    console.log(`✅ Assigned chirhoevents@gmail.com to ${testOrg.name} as org_admin`)
  }

  // Assign juanitohola13@gmail.com to prod org
  if (prodOrg && prodOrgAdmin && prodOrgAdmin.organizationId !== prodOrg.id) {
    await prisma.user.update({
      where: { id: prodOrgAdmin.id },
      data: {
        organizationId: prodOrg.id,
        role: 'org_admin',
      },
    })
    console.log(`✅ Assigned juanitohola13@gmail.com to ${prodOrg.name} as org_admin`)
  }

  // Step 5: Verify final state
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  FINAL STATE')
  console.log('═══════════════════════════════════════════════════════════════\n')

  console.log('─── Events ───')
  const finalEvents = await prisma.event.findMany({
    select: {
      name: true,
      organization: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  for (const event of finalEvents) {
    console.log(`  ✓ ${event.name} → ${event.organization?.name}`)
  }

  console.log('\n─── Users ───')
  const finalUsers = await prisma.user.findMany({
    where: {
      email: {
        in: ['17juangalindo@gmail.com', 'chirhoevents@gmail.com', 'juanitohola13@gmail.com'],
      },
    },
    select: {
      email: true,
      role: true,
      organization: { select: { name: true } },
    },
  })

  for (const user of finalUsers) {
    console.log(`  ✓ ${user.email} (${user.role}) → ${user.organization?.name || 'All (Master Admin)'}`)
  }

  console.log('\n✅ Organization structure fixed successfully!\n')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
