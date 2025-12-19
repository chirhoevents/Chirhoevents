import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify org admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('Running migration for confirmation codes...')

    // Add the confirmation_code column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "individual_registrations"
      ADD COLUMN IF NOT EXISTS "confirmation_code" VARCHAR(50);
    `)
    console.log('✓ Added confirmation_code column')

    // Create unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "individual_registrations_confirmation_code_key"
      ON "individual_registrations"("confirmation_code");
    `)
    console.log('✓ Created unique index')

    // Create regular index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_individual_confirmation_code"
      ON "individual_registrations"("confirmation_code");
    `)
    console.log('✓ Created index')

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!'
    })
  } catch (error: any) {
    console.error('Migration failed:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 })
  }
}
