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
      parent_token,
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
    if (!parent_token || !emergency_contact_1_name || !emergency_contact_1_phone ||
        !emergency_contact_1_relation || !insurance_provider || !insurance_policy_number ||
        !signature_full_name || !signature_initials || !certify_accurate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find liability form by parent token
    const liabilityForm = await prisma.liabilityForm.findUnique({
      where: { parentToken: parent_token },
      include: {
        event: true,
        organization: true,
      },
    })

    if (!liabilityForm) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (liabilityForm.parentTokenExpiresAt && new Date() > liabilityForm.parentTokenExpiresAt) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 410 }
      )
    }

    // Check if already completed
    if (liabilityForm.completed) {
      return NextResponse.json(
        { error: 'This form has already been completed' },
        { status: 400 }
      )
    }

    // Get group registration for group leader email
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: {
        eventId: liabilityForm.eventId,
        organizationId: liabilityForm.organizationId,
      },
    })

    // Build signature data JSON
    const signatureData = {
      full_legal_name: signature_full_name,
      initials: signature_initials,
      date_signed: signature_date,
      sections_initialed: ['medical_consent', 'activity_waiver', 'photo_release', 'transportation'],
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    }

    // Update liability form with parent's data
    const updatedForm = await prisma.liabilityForm.update({
      where: { id: liabilityForm.id },
      data: {
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
        completedByEmail: liabilityForm.parentEmail,
        completedAt: new Date(),
      },
      include: {
        event: true,
      },
    })

    // Generate PDF URL (using API endpoint for now until R2 is set up)
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/liability/forms/${updatedForm.id}/pdf`

    // Update form with PDF URL
    await prisma.liabilityForm.update({
      where: { id: updatedForm.id },
      data: { pdfUrl },
    })

    // Count total forms for this group
    const totalFormsCompleted = await prisma.liabilityForm.count({
      where: {
        eventId: liabilityForm.eventId,
        organizationId: liabilityForm.organizationId,
        completed: true,
      },
    })

    // Build review link for parent
    const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/poros/review/${parent_token}`

    // Send confirmation email to parent
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: liabilityForm.parentEmail!,
      subject: `✅ Form Completed - ${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}`,
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

            <p>Thank you for completing <strong>${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}</strong>'s liability form for <strong>${liabilityForm.event.name}</strong>.</p>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400E;"><strong>Important:</strong> Once submitted, this form cannot be edited. If you believe a mistake was made, please contact your group leader immediately to make the necessary changes.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewLink}" style="display: inline-block; background-color: #1E3A5F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📄 Review Your Submitted Form
              </a>
            </div>

            ${pdfUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${pdfUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  📥 Download PDF Copy
                </a>
              </div>
            ` : ''}

            <p style="font-size: 14px; color: #666;">
              A copy has been sent to your group leader at ${groupRegistration?.groupLeaderEmail || 'the group leader'}.
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

    // Send notification email to group leader
    if (groupRegistration) {
      const totalParticipants = groupRegistration.totalParticipants
      const formsRemaining = totalParticipants - totalFormsCompleted

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: groupRegistration.groupLeaderEmail,
        subject: `✅ Form Completed: ${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F;">Form Completed</h1>

              <p><strong>${liabilityForm.participantFirstName} ${liabilityForm.participantLastName}</strong> has completed their liability form for ${liabilityForm.event.name}.</p>

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
    }

    return NextResponse.json({
      success: true,
      form_id: updatedForm.id,
      pdf_url: pdfUrl,
    })
  } catch (error) {
    console.error('Youth U18 complete error:', error)
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again.' },
      { status: 500 }
    )
  }
}
