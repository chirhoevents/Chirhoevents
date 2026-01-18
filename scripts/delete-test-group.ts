import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_GROUP_ID = '246f2204-e379-497e-b012-55d3c080e609';

async function deleteTestGroup() {
  console.log('Deleting test group registration...\n');

  try {
    // Find the group registration
    const group = await prisma.groupRegistration.findUnique({
      where: { id: TEST_GROUP_ID },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            capacityRemaining: true,
            capacityTotal: true,
          },
        },
        participants: true,
      },
    });

    if (!group) {
      console.log('Test group registration not found');
      console.log(`   Looking for ID: ${TEST_GROUP_ID}`);
      return;
    }

    console.log(`Found group registration:`);
    console.log(`   Group Name: ${group.groupName}`);
    console.log(`   Parish: ${group.parishName}`);
    console.log(`   Leader: ${group.groupLeaderName} (${group.groupLeaderEmail})`);
    console.log(`   Access Code: ${group.accessCode}`);
    console.log(`   Event: ${group.event.name}`);
    console.log(`   Total Participants: ${group.totalParticipants}`);
    console.log(`   Participants in DB: ${group.participants.length}`);
    console.log('');

    // Calculate capacity to restore
    const participantCount = group.totalParticipants || 0;
    const onCampusCount = (group.onCampusYouth || 0) + (group.onCampusChaperones || 0);
    const offCampusCount = (group.offCampusYouth || 0) + (group.offCampusChaperones || 0);
    const dayPassCount = (group.dayPassYouth || 0) + (group.dayPassChaperones || 0);

    console.log('Housing breakdown:');
    console.log(`   On-campus: ${onCampusCount}`);
    console.log(`   Off-campus: ${offCampusCount}`);
    console.log(`   Day pass: ${dayPassCount}`);
    console.log('');

    // Delete in order due to foreign key constraints
    console.log('Deleting participants...');
    const participantsDeleted = await prisma.participant.deleteMany({
      where: { groupRegistrationId: TEST_GROUP_ID },
    });
    console.log(`   Deleted ${participantsDeleted.count} participants`);

    console.log('Deleting liability forms...');
    const formsDeleted = await prisma.liabilityForm.deleteMany({
      where: { groupRegistrationId: TEST_GROUP_ID },
    });
    console.log(`   Deleted ${formsDeleted.count} liability forms`);

    console.log('Deleting payment balance...');
    const balanceDeleted = await prisma.paymentBalance.deleteMany({
      where: { registrationId: TEST_GROUP_ID, registrationType: 'group' },
    });
    console.log(`   Deleted ${balanceDeleted.count} payment balance records`);

    console.log('Deleting payments...');
    const paymentsDeleted = await prisma.payment.deleteMany({
      where: { registrationId: TEST_GROUP_ID, registrationType: 'group' },
    });
    console.log(`   Deleted ${paymentsDeleted.count} payment records`);

    console.log('Deleting user preferences...');
    const prefsDeleted = await prisma.userPreferences.deleteMany({
      where: { groupRegistrationId: TEST_GROUP_ID },
    });
    console.log(`   Deleted ${prefsDeleted.count} user preference records`);

    // Restore housing option capacities
    if (onCampusCount > 0) {
      console.log(`Restoring on-campus capacity: +${onCampusCount}`);
      await prisma.event.update({
        where: { id: group.eventId },
        data: {
          onCampusRemaining: { increment: onCampusCount },
        },
      });
    }
    if (offCampusCount > 0) {
      console.log(`Restoring off-campus capacity: +${offCampusCount}`);
      await prisma.event.update({
        where: { id: group.eventId },
        data: {
          offCampusRemaining: { increment: offCampusCount },
        },
      });
    }
    if (dayPassCount > 0) {
      console.log(`Restoring day-pass capacity: +${dayPassCount}`);
      await prisma.event.update({
        where: { id: group.eventId },
        data: {
          dayPassRemaining: { increment: dayPassCount },
        },
      });
    }

    // Restore event-level capacity
    if (participantCount > 0 && group.event.capacityTotal !== null) {
      console.log(`Restoring event capacity: +${participantCount}`);
      await prisma.event.update({
        where: { id: group.eventId },
        data: {
          capacityRemaining: { increment: participantCount },
        },
      });
    }

    // Delete the group registration
    console.log('Deleting group registration...');
    await prisma.groupRegistration.delete({
      where: { id: TEST_GROUP_ID },
    });
    console.log('   Group registration deleted');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST GROUP DELETED SUCCESSFULLY!');
    console.log(`   Group: ${group.groupName}`);
    console.log(`   Capacity restored: ${participantCount} spots`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Error deleting test group:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestGroup();
