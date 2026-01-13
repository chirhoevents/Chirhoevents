import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestOrganization() {
  console.log('🗑️  Deleting test organization...\n');

  try {
    // Find the test organization by name (Holy Spirit youth ministry organization)
    const org = await prisma.organization.findFirst({
      where: {
        name: {
          contains: 'Holy Spirit youth ministry',
          mode: 'insensitive'
        }
      },
      include: {
        events: true,
        users: true,
      },
    });

    if (!org) {
      console.log('⚠️  Test organization not found');
      console.log('   Looking for org with name containing: Holy Spirit youth ministry');
      return;
    }

    console.log(`Found organization: ${org.name} (${org.id})`);
    console.log(`   Events: ${org.events.length}`);
    console.log(`   Users: ${org.users.length}`);
    console.log('');

    // Get event IDs for cleanup
    const eventIds = org.events.map((e: { id: string }) => e.id);

    // Delete in order due to foreign key constraints
    console.log('📝 Deleting payments...');
    const paymentsDeleted = await prisma.payment.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${paymentsDeleted.count} payments`);

    console.log('📝 Deleting payment balances...');
    const balancesDeleted = await prisma.paymentBalance.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${balancesDeleted.count} payment balances`);

    console.log('📝 Deleting support tickets...');
    const ticketsDeleted = await prisma.supportTicket.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${ticketsDeleted.count} support tickets`);

    console.log('📝 Deleting invoices...');
    const invoicesDeleted = await prisma.invoice.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${invoicesDeleted.count} invoices`);

    console.log('📝 Deleting billing notes...');
    const billingNotesDeleted = await prisma.billingNote.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${billingNotesDeleted.count} billing notes`);

    console.log('📝 Deleting platform activity logs...');
    const activityLogsDeleted = await prisma.platformActivityLog.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${activityLogsDeleted.count} activity logs`);

    console.log('📝 Deleting report templates...');
    const reportTemplatesDeleted = await prisma.reportTemplate.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${reportTemplatesDeleted.count} report templates`);

    console.log('📝 Deleting email logs...');
    const emailLogsDeleted = await prisma.emailLog.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${emailLogsDeleted.count} email logs`);

    console.log('📝 Deleting vendor registrations...');
    const vendorRegsDeleted = await prisma.vendorRegistration.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${vendorRegsDeleted.count} vendor registrations`);

    console.log('📝 Deleting staff registrations...');
    const staffRegsDeleted = await prisma.staffRegistration.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${staffRegsDeleted.count} staff registrations`);

    console.log('📝 Deleting coupons...');
    const couponsDeleted = await prisma.coupon.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${couponsDeleted.count} coupons`);

    console.log('📝 Deleting safe environment certificates...');
    const certsDeleted = await prisma.safeEnvironmentCertificate.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${certsDeleted.count} certificates`);

    console.log('📝 Deleting liability forms...');
    const formsDeleted = await prisma.liabilityForm.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${formsDeleted.count} liability forms`);

    console.log('📝 Deleting participants...');
    const participantsDeleted = await prisma.participant.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${participantsDeleted.count} participants`);

    console.log('📝 Deleting group registrations...');
    const groupRegsDeleted = await prisma.groupRegistration.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${groupRegsDeleted.count} group registrations`);

    console.log('📝 Deleting individual registrations...');
    const individualRegsDeleted = await prisma.individualRegistration.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${individualRegsDeleted.count} individual registrations`);

    console.log('📝 Deleting event pricing...');
    const pricingDeleted = await prisma.eventPricing.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    console.log(`   Deleted ${pricingDeleted.count} event pricing records`);

    console.log('📝 Deleting event settings...');
    const settingsDeleted = await prisma.eventSettings.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    console.log(`   Deleted ${settingsDeleted.count} event settings records`);

    console.log('📝 Deleting liability form templates...');
    const templatesDeleted = await prisma.liabilityFormTemplate.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${templatesDeleted.count} templates`);

    console.log('📝 Deleting events...');
    const eventsDeleted = await prisma.event.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${eventsDeleted.count} events`);

    console.log('📝 Deleting users...');
    const usersDeleted = await prisma.user.deleteMany({
      where: { organizationId: org.id },
    });
    console.log(`   Deleted ${usersDeleted.count} users`);

    console.log('📝 Deleting organization...');
    await prisma.organization.delete({
      where: { id: org.id },
    });
    console.log('   Organization deleted');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST ORGANIZATION DELETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error deleting test organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestOrganization();
