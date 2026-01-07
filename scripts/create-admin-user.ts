import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // ============================================
    // REPLACE THESE VALUES WITH YOUR INFO:
    // ============================================
    const CLERK_USER_ID = 'user_YOUR_CLERK_ID_HERE'; // Get from Clerk dashboard
    const EMAIL = 'your-email@example.com';
    const FIRST_NAME = 'Your';
    const LAST_NAME = 'Name';
    // ============================================

    console.log('🔍 Looking for organization...');

    // Get the organization (Mount Saint Mary Seminary)
    let organization = await prisma.organization.findFirst({
      where: {
        name: {
          contains: 'Mount Saint Mary',
        },
      },
    });

    if (!organization) {
      console.log('⚠️ Organization not found, creating...');

      organization = await prisma.organization.create({
        data: {
          name: 'Mount Saint Mary Seminary',
          type: 'seminary',
          contactEmail: EMAIL,
          subscriptionTier: 'starter',
          subscriptionStatus: 'active',
          monthlyFee: 0,
          storageLimitGb: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log('✅ Organization created:', organization.id);
    } else {
      console.log('✅ Found organization:', organization.name);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        clerkUserId: CLERK_USER_ID,
      },
    });

    if (existingUser) {
      console.log('⚠️ User already exists!');
      console.log('   Current role:', existingUser.role);

      if (existingUser.role !== 'org_admin' && existingUser.role !== 'master_admin') {
        console.log('🔄 Updating role to org_admin...');

        const updatedUser = await prisma.user.update({
          where: {
            clerkUserId: CLERK_USER_ID,
          },
          data: {
            role: 'org_admin',
            organizationId: organization.id,
          },
        });

        console.log('✅ User updated successfully!');
        console.log('   New role:', updatedUser.role);
      } else {
        console.log('✅ User is already an admin!');
      }
      return;
    }

    // Create new user
    console.log('👤 Creating new admin user...');

    const user = await prisma.user.create({
      data: {
        clerkUserId: CLERK_USER_ID,
        email: EMAIL,
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        role: 'org_admin',
        organizationId: organization.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('');
    console.log('✅ ===================================');
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log('✅ ===================================');
    console.log('');
    console.log('📋 Details:');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Organization:', organization.name);
    console.log('');
    console.log('🎉 You can now log in to /dashboard/admin');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ===================================');
    console.error('❌ ERROR CREATING ADMIN USER');
    console.error('❌ ===================================');
    console.error('');
    console.error('Error details:', error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Make sure your DATABASE_URL is correct in .env');
    console.error('   2. Make sure you replaced CLERK_USER_ID with your actual Clerk ID');
    console.error('   3. Check that the database is accessible');
    console.error('');
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
