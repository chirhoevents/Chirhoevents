import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestOrganization() {
  console.log('🧪 Creating test organization...\n');

  try {
    // Check if test org already exists
    const existingOrg = await prisma.organization.findFirst({
      where: { contactEmail: 'director@holyspirit-test.com' },
    });

    if (existingOrg) {
      console.log('⚠️  Test organization already exists!');
      console.log('   Organization ID:', existingOrg.id);
      console.log('   Run delete-test-organization.ts first to clean up.\n');
      return;
    }

    // 1. CREATE ORGANIZATION
    console.log('📝 Step 1: Creating organization...');

    const organization = await prisma.organization.create({
      data: {
        name: 'Holy Spirit Youth Ministry',
        type: 'parish',
        address: {
          street: '123 Faith Street',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          country: 'United States',
        },
        contactName: 'Sarah Johnson',
        contactEmail: 'director@holyspirit-test.com',
        contactPhone: '555-123-4567',
        website: 'https://holyspirityouth-test.com',
        subscriptionTier: 'growing',
        subscriptionStatus: 'active',
        monthlyFee: 150.00,
        storageLimitGb: 50,
        eventsPerYearLimit: 10,
        status: 'active',
        modulesEnabled: { poros: true, salve: true, rapha: true },
        checkPaymentName: 'Holy Spirit Youth Ministry',
        checkPaymentAddress: '123 Faith Street, Austin, TX 78701',
      },
    });

    console.log('✅ Organization created:', organization.id);

    // 2. CREATE ORG ADMIN USER
    console.log('📝 Step 2: Creating org admin...');

    const orgAdmin = await prisma.user.create({
      data: {
        email: 'director@holyspirit-test.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        preferredName: 'Sarah',
        phone: '555-123-4567',
        role: 'org_admin',
        organizationId: organization.id,
        clerkUserId: null, // Will be set when they sign up
      },
    });

    console.log('✅ Org admin created:', orgAdmin.id);

    // 3. CREATE EVENT 1: SUMMER RETREAT (GROUP REGISTRATION)
    console.log('📝 Step 3: Creating Summer Retreat event (group)...');

    const summerRetreat = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: 'Summer Youth Retreat 2026',
        slug: 'summer-retreat-2026',
        description: 'Join us for an incredible weekend of faith, fun, and fellowship! Our annual summer retreat brings together youth from across the diocese for worship, small groups, activities, and powerful witness talks.',
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-13'),
        locationName: 'Camp Holy Cross',
        locationAddress: {
          street: '500 Retreat Road',
          city: 'Dripping Springs',
          state: 'TX',
          zip: '78620',
        },
        timezone: 'America/Chicago',
        capacityTotal: 500,
        capacityRemaining: 485,
        status: 'published',
        registrationOpenDate: new Date('2026-03-01T00:00:00Z'),
        registrationCloseDate: new Date('2026-07-08T23:59:59Z'),
        enableWaitlist: true,
        waitlistCapacity: 50,
        createdBy: orgAdmin.id,
      },
    });

    console.log('✅ Summer Retreat event created:', summerRetreat.id);

    // Create event settings for Summer Retreat
    await prisma.eventSettings.create({
      data: {
        eventId: summerRetreat.id,
        groupRegistrationEnabled: true,
        individualRegistrationEnabled: false,
        liabilityFormsRequiredGroup: true,
        showDietaryRestrictions: true,
        dietaryRestrictionsRequired: true,
        showAdaAccommodations: true,
        porosHousingEnabled: true,
        porosSmallGroupEnabled: true,
        salveCheckinEnabled: true,
        raphaMedicalEnabled: true,
        tshirtsEnabled: true,
        allowOnCampus: true,
        allowOffCampus: true,
        allowDayPass: true,
        checkPaymentEnabled: true,
        checkPaymentPayableTo: 'Holy Spirit Youth Ministry',
        checkPaymentAddress: '123 Faith Street, Austin, TX 78701',
        registrationInstructions: 'Please have your group roster ready before registering. You will need each participant\'s name, age, gender, and t-shirt size.',
        primaryColor: '#1E3A5F',
        secondaryColor: '#9C8466',
      },
    });

    // Create event pricing for Summer Retreat
    await prisma.eventPricing.create({
      data: {
        eventId: summerRetreat.id,
        youthEarlyBirdPrice: 90.00,
        youthRegularPrice: 100.00,
        youthLatePrice: 120.00,
        chaperoneEarlyBirdPrice: 65.00,
        chaperoneRegularPrice: 75.00,
        chaperoneLatePrice: 90.00,
        priestPrice: 0.00,
        onCampusYouthPrice: 100.00,
        onCampusChaperonePrice: 75.00,
        offCampusYouthPrice: 75.00,
        offCampusChaperonePrice: 50.00,
        dayPassYouthPrice: 50.00,
        dayPassChaperonePrice: 25.00,
        depositAmount: 25.00,
        depositPercentage: null,
        depositPerPerson: true,
        requireFullPayment: false,
        earlyBirdDeadline: new Date('2026-05-01T23:59:59Z'),
        regularDeadline: new Date('2026-06-15T23:59:59Z'),
        fullPaymentDeadline: new Date('2026-07-01T23:59:59Z'),
        lateFeePercentage: 20.00,
        lateFeeAutoApply: true,
        currency: 'USD',
      },
    });

    console.log('✅ Summer Retreat settings and pricing created');

    // 4. CREATE EVENT 2: FALL CONFERENCE (INDIVIDUAL REGISTRATION)
    console.log('📝 Step 4: Creating Fall Conference event (individual)...');

    const fallConference = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: 'Fall Youth Conference 2026',
        slug: 'fall-conference-2026',
        description: 'A one-day conference featuring dynamic speakers, breakout sessions, Mass, Adoration, and Confession. Perfect for high school students looking to grow in their faith!',
        startDate: new Date('2026-10-24'),
        endDate: new Date('2026-10-24'),
        locationName: 'Holy Spirit Parish Hall',
        locationAddress: {
          street: '123 Faith Street',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
        },
        timezone: 'America/Chicago',
        capacityTotal: 200,
        capacityRemaining: 196,
        status: 'published',
        registrationOpenDate: new Date('2026-08-01T00:00:00Z'),
        registrationCloseDate: new Date('2026-10-23T23:59:59Z'),
        enableWaitlist: false,
        createdBy: orgAdmin.id,
      },
    });

    console.log('✅ Fall Conference event created:', fallConference.id);

    // Create event settings for Fall Conference
    await prisma.eventSettings.create({
      data: {
        eventId: fallConference.id,
        groupRegistrationEnabled: false,
        individualRegistrationEnabled: true,
        liabilityFormsRequiredIndividual: true,
        showDietaryRestrictions: true,
        showAdaAccommodations: true,
        salveCheckinEnabled: true,
        raphaMedicalEnabled: false,
        tshirtsEnabled: true,
        allowOnCampus: false,
        allowOffCampus: false,
        allowDayPass: true,
        checkPaymentEnabled: true,
        checkPaymentPayableTo: 'Holy Spirit Youth Ministry',
        checkPaymentAddress: '123 Faith Street, Austin, TX 78701',
        registrationInstructions: 'Please have your emergency contact information ready before registering.',
        primaryColor: '#1E3A5F',
        secondaryColor: '#9C8466',
      },
    });

    // Create event pricing for Fall Conference
    await prisma.eventPricing.create({
      data: {
        eventId: fallConference.id,
        youthEarlyBirdPrice: 35.00,
        youthRegularPrice: 45.00,
        youthLatePrice: 55.00,
        chaperoneEarlyBirdPrice: 25.00,
        chaperoneRegularPrice: 30.00,
        chaperoneLatePrice: 40.00,
        priestPrice: 0.00,
        depositAmount: null,
        depositPercentage: null,
        requireFullPayment: true,
        depositPerPerson: false,
        earlyBirdDeadline: new Date('2026-09-15T23:59:59Z'),
        regularDeadline: new Date('2026-10-15T23:59:59Z'),
        lateFeePercentage: 15.00,
        lateFeeAutoApply: true,
        currency: 'USD',
      },
    });

    console.log('✅ Fall Conference settings and pricing created');

    // 5. CREATE SAMPLE GROUP REGISTRATION (for Summer Retreat)
    console.log('📝 Step 5: Creating sample group registration...');

    const groupRegistration = await prisma.groupRegistration.create({
      data: {
        eventId: summerRetreat.id,
        organizationId: organization.id,
        accessCode: 'TEST-STMARYS-2026',
        groupName: "St. Mary's Youth Group",
        parishName: 'St. Mary Catholic Church',
        dioceseName: 'Diocese of Austin',
        groupLeaderName: 'Michael Chen',
        groupLeaderEmail: 'mchen@stmarys-test.com',
        groupLeaderPhone: '555-234-5678',
        groupLeaderStreet: '456 Parish Lane',
        groupLeaderCity: 'Austin',
        groupLeaderState: 'TX',
        groupLeaderZip: '78702',
        alternativeContact1Name: 'Jennifer Chen',
        alternativeContact1Email: 'jchen@stmarys-test.com',
        alternativeContact1Phone: '555-234-5679',
        housingType: 'on_campus',
        specialRequests: 'Please place our group together for small groups. We have 2 youth with severe peanut allergies.',
        dietaryRestrictionsSummary: 'Vegetarian (2), Gluten-free (1), Vegan (1), Dairy-free (1)',
        youthCount: 12,
        chaperoneCount: 3,
        priestCount: 0,
        totalParticipants: 15,
        registrationStatus: 'pending_payment',
        registeredAt: new Date('2026-03-15T10:30:00Z'),
      },
    });

    console.log('✅ Group registration created:', groupRegistration.id);

    // Create participants for the group
    const participantsData = [
      // Youth participants (under 18)
      { firstName: 'Emma', lastName: 'Rodriguez', age: 16, gender: 'female' as const, participantType: 'youth_u18' as const, tShirtSize: 'M', parentEmail: 'rodriguez.parents@email-test.com' },
      { firstName: 'Noah', lastName: 'Williams', age: 15, gender: 'male' as const, participantType: 'youth_u18' as const, tShirtSize: 'L', parentEmail: 'williams.parents@email-test.com' },
      { firstName: 'Sophia', lastName: 'Martinez', age: 17, gender: 'female' as const, participantType: 'youth_u18' as const, tShirtSize: 'S', parentEmail: 'martinez.parents@email-test.com' },
      { firstName: 'Liam', lastName: 'Garcia', age: 14, gender: 'male' as const, participantType: 'youth_u18' as const, tShirtSize: 'M', parentEmail: 'garcia.parents@email-test.com' },
      { firstName: 'Olivia', lastName: 'Johnson', age: 16, gender: 'female' as const, participantType: 'youth_u18' as const, tShirtSize: 'M', parentEmail: 'johnson.parents@email-test.com' },
      { firstName: 'Ethan', lastName: 'Brown', age: 15, gender: 'male' as const, participantType: 'youth_u18' as const, tShirtSize: 'L', parentEmail: 'brown.parents@email-test.com' },
      { firstName: 'Ava', lastName: 'Davis', age: 17, gender: 'female' as const, participantType: 'youth_u18' as const, tShirtSize: 'S', parentEmail: 'davis.parents@email-test.com' },
      { firstName: 'Mason', lastName: 'Miller', age: 16, gender: 'male' as const, participantType: 'youth_u18' as const, tShirtSize: 'XL', parentEmail: 'miller.parents@email-test.com' },
      { firstName: 'Isabella', lastName: 'Wilson', age: 14, gender: 'female' as const, participantType: 'youth_u18' as const, tShirtSize: 'S', parentEmail: 'wilson.parents@email-test.com' },
      { firstName: 'Lucas', lastName: 'Moore', age: 15, gender: 'male' as const, participantType: 'youth_u18' as const, tShirtSize: 'M', parentEmail: 'moore.parents@email-test.com' },
      // Youth (over 18)
      { firstName: 'Mia', lastName: 'Taylor', age: 18, gender: 'female' as const, participantType: 'youth_o18' as const, tShirtSize: 'M', email: 'mia.taylor@email-test.com' },
      { firstName: 'James', lastName: 'Anderson', age: 18, gender: 'male' as const, participantType: 'youth_o18' as const, tShirtSize: 'L', email: 'james.anderson@email-test.com' },
      // Chaperones
      { firstName: 'Jennifer', lastName: 'Chen', age: 42, gender: 'female' as const, participantType: 'chaperone' as const, tShirtSize: 'M', email: 'jchen@stmarys-test.com' },
      { firstName: 'David', lastName: 'Rodriguez', age: 45, gender: 'male' as const, participantType: 'chaperone' as const, tShirtSize: 'XL', email: 'drodriguez@stmarys-test.com' },
      { firstName: 'Lisa', lastName: 'Martinez', age: 38, gender: 'female' as const, participantType: 'chaperone' as const, tShirtSize: 'S', email: 'lmartinez@stmarys-test.com' },
    ];

    for (const pData of participantsData) {
      await prisma.participant.create({
        data: {
          groupRegistrationId: groupRegistration.id,
          organizationId: organization.id,
          firstName: pData.firstName,
          lastName: pData.lastName,
          age: pData.age,
          gender: pData.gender,
          participantType: pData.participantType,
          tShirtSize: pData.tShirtSize,
          email: pData.email || null,
          parentEmail: pData.parentEmail || null,
          liabilityFormCompleted: false,
        },
      });
    }

    console.log('✅ Created 15 participants for group registration');

    // Create payment balance record for group
    const totalGroupAmount = (12 * 100.00) + (3 * 75.00); // 12 youth @ $100 + 3 chaperones @ $75 = $1,425
    const depositAmount = 15 * 25.00; // $25 per person deposit = $375

    await prisma.paymentBalance.create({
      data: {
        organizationId: organization.id,
        eventId: summerRetreat.id,
        registrationId: groupRegistration.id,
        registrationType: 'group',
        totalAmountDue: totalGroupAmount,
        amountPaid: depositAmount,
        amountRemaining: totalGroupAmount - depositAmount,
        paymentStatus: 'partial',
        lastPaymentDate: new Date('2026-03-15T10:35:00Z'),
      },
    });

    // Create deposit payment transaction (Stripe test payment)
    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        eventId: summerRetreat.id,
        registrationId: groupRegistration.id,
        registrationType: 'group',
        amount: depositAmount,
        paymentType: 'deposit',
        paymentMethod: 'card',
        paymentStatus: 'succeeded',
        stripePaymentIntentId: 'pi_test_' + Math.random().toString(36).substring(2, 26),
        cardLast4: '4242',
        cardBrand: 'visa',
        processedVia: 'online',
        processedAt: new Date('2026-03-15T10:35:00Z'),
      },
    });

    console.log('✅ Payment records created for group registration');
    console.log(`   Total: $${totalGroupAmount.toFixed(2)}, Deposit: $${depositAmount.toFixed(2)}, Balance: $${(totalGroupAmount - depositAmount).toFixed(2)}`);

    // 6. CREATE SAMPLE INDIVIDUAL REGISTRATIONS (for Fall Conference)
    console.log('📝 Step 6: Creating sample individual registrations...');

    const individualRegistrants = [
      { firstName: 'Alex', lastName: 'Thompson', age: 17, email: 'alex.thompson@email-test.com', phone: '555-345-6789', gender: 'male' as const, amount: 35.00 },
      { firstName: 'Grace', lastName: 'Lee', age: 16, email: 'grace.lee@email-test.com', phone: '555-456-7890', gender: 'female' as const, amount: 35.00 },
      { firstName: 'Daniel', lastName: 'Nguyen', age: 18, email: 'daniel.nguyen@email-test.com', phone: '555-567-8901', gender: 'male' as const, amount: 45.00 },
      { firstName: 'Maria', lastName: 'Santos', age: 15, email: 'maria.santos@email-test.com', phone: '555-678-9012', gender: 'female' as const, amount: 35.00 },
    ];

    for (let i = 0; i < individualRegistrants.length; i++) {
      const registrant = individualRegistrants[i];
      const confirmationCode = `CONF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const individualReg = await prisma.individualRegistration.create({
        data: {
          eventId: fallConference.id,
          organizationId: organization.id,
          firstName: registrant.firstName,
          lastName: registrant.lastName,
          email: registrant.email,
          phone: registrant.phone,
          age: registrant.age,
          gender: registrant.gender,
          housingType: 'day_pass',
          tShirtSize: ['S', 'M', 'L', 'XL'][i % 4],
          dietaryRestrictions: i === 1 ? 'Vegetarian' : null,
          adaAccommodations: null,
          emergencyContact1Name: 'Parent/Guardian',
          emergencyContact1Phone: '555-999-0000',
          emergencyContact1Relation: 'Parent',
          registrationStatus: 'complete',
          qrCode: `QR-${confirmationCode}`,
          confirmationCode: confirmationCode,
          registeredAt: new Date(`2026-09-${10 + i}T14:30:00Z`),
        },
      });

      // Create payment balance
      await prisma.paymentBalance.create({
        data: {
          organizationId: organization.id,
          eventId: fallConference.id,
          registrationId: individualReg.id,
          registrationType: 'individual',
          totalAmountDue: registrant.amount,
          amountPaid: registrant.amount,
          amountRemaining: 0,
          paymentStatus: 'paid_full',
          lastPaymentDate: new Date(`2026-09-${10 + i}T14:35:00Z`),
        },
      });

      // Create payment transaction
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          eventId: fallConference.id,
          registrationId: individualReg.id,
          registrationType: 'individual',
          amount: registrant.amount,
          paymentType: 'balance',
          paymentMethod: 'card',
          paymentStatus: 'succeeded',
          stripePaymentIntentId: 'pi_test_' + Math.random().toString(36).substring(2, 26),
          cardLast4: '4242',
          cardBrand: 'visa',
          processedVia: 'online',
          processedAt: new Date(`2026-09-${10 + i}T14:35:00Z`),
        },
      });
    }

    console.log('✅ Created 4 individual registrations (all paid in full)');

    // 7. SUMMARY
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST ORGANIZATION CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log(`   Organization: ${organization.name}`);
    console.log(`   Org ID: ${organization.id}`);
    console.log(`   Org Admin: ${orgAdmin.email} (ID: ${orgAdmin.id})`);
    console.log('');
    console.log(`   📅 Event 1: ${summerRetreat.name}`);
    console.log(`      - Event ID: ${summerRetreat.id}`);
    console.log(`      - Slug: ${summerRetreat.slug}`);
    console.log('      - Type: Group Registration');
    console.log(`      - 1 group (St. Mary's) with 15 participants`);
    console.log(`      - Deposit paid: $${depositAmount.toFixed(2)}, Balance: $${(totalGroupAmount - depositAmount).toFixed(2)}`);
    console.log(`      - Access Code: ${groupRegistration.accessCode}`);
    console.log('');
    console.log(`   📅 Event 2: ${fallConference.name}`);
    console.log(`      - Event ID: ${fallConference.id}`);
    console.log(`      - Slug: ${fallConference.slug}`);
    console.log('      - Type: Individual Registration');
    console.log('      - 4 individual registrants');
    console.log('      - All paid in full');
    console.log('');
    console.log('🔗 URLs (update with your domain):');
    console.log(`   - Public Events:`);
    console.log(`       /events/${summerRetreat.slug}`);
    console.log(`       /events/${fallConference.slug}`);
    console.log(`   - Group Leader Dashboard: /dashboard/group-leader`);
    console.log(`       (Link access code: ${groupRegistration.accessCode})`);
    console.log(`   - Org Admin Dashboard: /dashboard/admin`);
    console.log(`   - Master Admin View: /dashboard/master-admin/organizations/${organization.id}`);
    console.log('');
    console.log('💳 Stripe Test Mode:');
    console.log('   - All payments are TEST payments');
    console.log('   - Use test card: 4242 4242 4242 4242');
    console.log('   - Any future date, any CVC');
    console.log('');
    console.log('🧪 To delete test data, run:');
    console.log('   npx tsx scripts/delete-test-organization.ts');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating test organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrganization();
