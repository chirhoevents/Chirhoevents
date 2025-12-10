import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { generateLiabilityFormPDF } from '@/lib/pdf/generate-liability-form-pdf'
import { uploadLiabilityFormPDF } from '@/lib/r2/upload-pdf'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      access_code,
      first_name,
      last_name,
      preferred_name,
      age,
      gender,
      email,
      phone,
      participant_type,
      t_shirt_size,
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
      safe_env_cert_file,
      safe_env_cert_filename,
      safe_env_cert_program,
      safe_env_cert_completion_date,
      safe_env_cert_expiration_date,
      safe_env_cert_upload_later,
      signature_full_name,
      signature_initials,
      signature_date,
      certify_accurate,
    } = body

    // Validate required fields
    if (!access_code || !first_name || !last_name || !age || !gender ||
        !email || !phone || !participant_type || !t_shirt_size ||
        !emergency_contact_1_name || !emergency_contact_1_phone ||
        !emergency_contact_1_relation || !insurance_provider ||
        !insurance_policy_number || !signature_full_name ||
        !signature_initials || !certify_accurate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate age
    if (age < 18) {
      return NextResponse.json(
        { error: 'Age must be 18 or older for this form type' },
        { status: 400 }
      )
    }

    // Validate participant type
    if (participant_type !== 'youth_o18' && participant_type !== 'chaperone') {
      return NextResponse.json(
        { error: 'Invalid participant type' },
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
        formType: 'youth_o18_chaperone',
        participantType: participant_type,
        participantFirstName: first_name,
        participantLastName: last_name,
        participantPreferredName: preferred_name || null,
        participantAge: age,
        participantGender: gender,
        participantEmail: email,
        participantPhone: phone,
        tShirtSize: t_shirt_size,
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
      include: {
        event: true,
      },
    })

    // Handle safe environment certificate if chaperone and uploaded
    if (participant_type === 'chaperone' && safe_env_cert_file && !safe_env_cert_upload_later) {
      // TODO: Upload to Cloudflare R2 or other storage
      // For now, we'll store a placeholder URL
      // const fileUrl = await uploadToR2(safe_env_cert_file, safe_env_cert_filename)

      const fileUrl = `placeholder://certificates/${liabilityForm.id}/${safe_env_cert_filename}`

      await prisma.safeEnvironmentCertificate.create({
        data: {
          participantId: liabilityForm.id, // Using liability form ID as placeholder
          liabilityFormId: liabilityForm.id,
          organizationId: groupRegistration.organizationId,
          fileUrl: fileUrl,
          originalFilename: safe_env_cert_filename,
          programName: safe_env_cert_program,
          completionDate: safe_env_cert_completion_date ? new Date(safe_env_cert_completion_date) : null,
          expirationDate: safe_env_cert_expiration_date ? new Date(safe_env_cert_expiration_date) : null,
          status: 'pending',
        },
      })
    }

    // Generate PDF URL (using API endpoint for now until R2 is set up)
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/liability/forms/${liabilityForm.id}/pdf`

    // Update form with PDF URL
    await prisma.liabilityForm.update({
      where: { id: liabilityForm.id },
      data: { pdfUrl },
    })

    // Count total forms for progress tracking
    const totalFormsCompleted = await prisma.liabilityForm.count({
      where: {
        eventId: liabilityForm.eventId,
        organizationId: liabilityForm.organizationId,
        completed: true,
      },
    })

    // Send confirmation email to participant
    const certUploadedMessage = participant_type === 'chaperone' && safe_env_cert_file && !safe_env_cert_upload_later
      ? '<p style="color: #10B981; font-weight: bold;">✓ Your safe environment certificate has been uploaded and is pending verification.</p>'
      : participant_type === 'chaperone' && safe_env_cert_upload_later
      ? '<p style="color: #F59E0B; font-weight: bold;">⚠️ Please upload your safe environment certificate through the Group Leader Portal.</p>'
      : ''

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: email,
      subject: `✅ Form Completed - ${first_name} ${last_name}`,
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

            <p>Thank you for completing your liability form for <strong>${groupRegistration.event.name}</strong>.</p>

            ${certUploadedMessage}

            ${pdfUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${pdfUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  📥 Download PDF Copy
                </a>
              </div>
            ` : ''}

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
      subject: `✅ Form Completed: ${first_name} ${last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F;">Form Completed</h1>

            <p><strong>${first_name} ${last_name}</strong> (${participant_type === 'youth_o18' ? 'Youth 18+' : 'Chaperone'}) has completed their liability form for ${groupRegistration.event.name}.</p>

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
      pdf_url: pdfUrl,
    })
  } catch (error) {
    console.error('Youth O18/Chaperone submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again.' },
      { status: 500 }
    )
  }
}
