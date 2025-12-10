import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      access_code,
      clergy_title,
      first_name,
      last_name,
      preferred_name,
      age,
      email,
      phone,
      t_shirt_size,
      diocese_of_incardination,
      current_assignment,
      faculty_information,
      medical_conditions,
      medications,
      allergies,
      dietary_restrictions,
      ada_accommodations,
      emergency_contact_1_name,
      emergency_contact_1_phone,
      emergency_contact_1_relation,
      emergency_contact_2_name,
      emergency_contact_2_phone,
      emergency_contact_2_relation,
      insurance_provider,
      insurance_policy_number,
      insurance_group_number,
      signature_full_name,
      signature_initials,
      signature_date,
      certify_accurate,
    } = body

    // Validate required fields
    if (!access_code || !clergy_title || !first_name || !last_name ||
        !age || !email || !phone || !t_shirt_size ||
        !diocese_of_incardination || !emergency_contact_1_name ||
        !emergency_contact_1_phone || !emergency_contact_1_relation ||
        !insurance_provider || !insurance_policy_number ||
        !signature_full_name || !signature_initials || !certify_accurate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate age
    if (age < 18) {
      return NextResponse.json(
        { error: 'Age must be 18 or older' },
        { status: 400 }
      )
    }

    // Validate clergy title
    const validTitles = ['priest', 'deacon', 'bishop', 'cardinal']
    if (!validTitles.includes(clergy_title)) {
      return NextResponse.json(
        { error: 'Invalid clergy title' },
        { status: 400 }
      )
    }

    // Find group registration by access code
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { accessCode: access_code },
      include: { event: true, organization: true },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 404 }
      )
    }

    // Build signature data
    const signatureData = {
      full_legal_name: signature_full_name,
      initials: signature_initials,
      date_signed: signature_date,
      sections_initialed: ['medical_consent', 'activity_waiver', 'photo_release', 'transportation'],
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    }

    // Create liability form
    const liabilityForm = await prisma.liabilityForm.create({
      data: {
        organizationId: groupRegistration.organizationId,
        eventId: groupRegistration.eventId,
        formType: 'clergy',
        participantType: 'clergy' as any, // Cast to avoid type error
        participantFirstName: first_name,
        participantLastName: last_name,
        participantPreferredName: preferred_name || null,
        participantAge: age,
        participantEmail: email,
        participantPhone: phone,
        tShirtSize: t_shirt_size,
        clergyTitle: clergy_title,
        dioceseOfIncardination: diocese_of_incardination,
        currentAssignment: current_assignment || null,
        facultyInformation: faculty_information || null,
        medicalConditions: medical_conditions || null,
        medications: medications || null,
        allergies: allergies || null,
        dietaryRestrictions: dietary_restrictions || null,
        adaAccommodations: ada_accommodations || null,
        emergencyContact1Name: emergency_contact_1_name,
        emergencyContact1Phone: emergency_contact_1_phone,
        emergencyContact1Relation: emergency_contact_1_relation,
        emergencyContact2Name: emergency_contact_2_name || null,
        emergencyContact2Phone: emergency_contact_2_phone || null,
        emergencyContact2Relation: emergency_contact_2_relation || null,
        insuranceProvider: insurance_provider,
        insurancePolicyNumber: insurance_policy_number,
        insuranceGroupNumber: insurance_group_number || null,
        signatureData: signatureData,
        completed: true,
        completedByEmail: email,
        completedAt: new Date(),
      },
    })

    // Count total forms for progress tracking
    const totalFormsCompleted = await prisma.liabilityForm.count({
      where: {
        eventId: liabilityForm.eventId,
        organizationId: liabilityForm.organizationId,
        completed: true,
      },
    })

    // Determine greeting based on clergy title
    const greeting = clergy_title === 'priest' ? 'Father' :
                     clergy_title === 'deacon' ? 'Deacon' :
                     clergy_title === 'bishop' ? 'Your Excellency' :
                     clergy_title === 'cardinal' ? 'Your Eminence' : ''

    // Send confirmation email to clergy member
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: email,
      subject: `✅ Form Completed - ${greeting} ${last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="padding: 30px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 60px; height: 60px; background-color: #10B981; border-radius: 50%; padding: 15px;">
                <svg style="width: 30px; height: 30px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>

            <h1 style="color: #1E3A5F; text-align: center;">✅ Form Completed!</h1>

            <p>Thank you, ${greeting} ${last_name}, for completing your liability form for <strong>${groupRegistration.event.name}</strong>.</p>

            <p style="font-size: 14px; color: #666;">
              A copy has been sent to your group leader at ${groupRegistration.groupLeaderEmail}.
            </p>

            <p style="margin-top: 30px;">Pax Christi,<br><strong>ChiRho Events Team</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    // Send notification to group leader
    const totalParticipants = groupRegistration.totalParticipants
    const formsRemaining = totalParticipants - totalFormsCompleted

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: groupRegistration.groupLeaderEmail,
      subject: `✅ Form Completed: ${greeting} ${last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F;">Form Completed</h1>

            <p><strong>${greeting} ${last_name}</strong> has completed their liability form for ${groupRegistration.event.name}.</p>

            <div style="background-color: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1E3A5F;">Progress:</h3>
              <p style="font-size: 18px; margin: 10px 0;">
                <strong style="color: #10B981;">Forms completed: ${totalFormsCompleted}/${totalParticipants}</strong>
              </p>
              <p style="font-size: 16px; margin: 10px 0;">
                Forms remaining: ${formsRemaining}
              </p>
            </div>

            <p style="font-size: 14px; color: #666;">
              You can view all forms in your group leader portal (coming soon).
            </p>

            <p style="margin-top: 30px;">Pax Christi,<br><strong>ChiRho Events Team</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px; text-align: center;">
              © 2025 ChiRho Events. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      form_id: liabilityForm.id,
      pdf_url: null, // Will be implemented in Phase 4
    })
  } catch (error) {
    console.error('Clergy submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again.' },
      { status: 500 }
    )
  }
}
