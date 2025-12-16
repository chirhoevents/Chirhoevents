import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function PUT(
  request: NextRequest,
  { params }: { params: { participantId: string } }
) {
  try {
    const participantId = params.participantId
    const body = await request.json()

    const {
      firstName,
      lastName,
      preferredName,
      email,
      age,
      gender,
      participantType,
      tShirtSize,
      liabilityFormData,
      adminNotes,
      sendEmail,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !age) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, age' },
        { status: 400 }
      )
    }

    // Get existing participant
    const existingParticipant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        liabilityForms: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        groupRegistration: {
          include: {
            event: true,
          },
        },
      },
    })

    if (!existingParticipant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Store old values for audit trail
    const oldValues = {
      firstName: existingParticipant.firstName,
      lastName: existingParticipant.lastName,
      preferredName: existingParticipant.preferredName,
      email: existingParticipant.email,
      age: existingParticipant.age,
      gender: existingParticipant.gender,
      participantType: existingParticipant.participantType,
      tShirtSize: existingParticipant.tShirtSize,
    }

    // Update participant record
    const updatedParticipant = await prisma.participant.update({
      where: { id: participantId },
      data: {
        firstName,
        lastName,
        preferredName: preferredName || null,
        email: email || null,
        age: parseInt(age),
        gender,
        participantType,
        tShirtSize: tShirtSize || null,
        updatedAt: new Date(),
      },
    })

    // Update or create liability form if data is provided and participant has a liability form
    let updatedLiabilityForm = null
    const existingLiabilityForm = existingParticipant.liabilityForms[0]

    if (liabilityFormData && existingLiabilityForm) {
      // Store old liability form values for audit trail
      const oldLiabilityFormValues = {
        participantPhone: existingLiabilityForm.participantPhone,
        medicalConditions: existingLiabilityForm.medicalConditions,
        medications: existingLiabilityForm.medications,
        allergies: existingLiabilityForm.allergies,
        dietaryRestrictions: existingLiabilityForm.dietaryRestrictions,
        adaAccommodations: existingLiabilityForm.adaAccommodations,
        emergencyContact1Name: existingLiabilityForm.emergencyContact1Name,
        emergencyContact1Phone: existingLiabilityForm.emergencyContact1Phone,
        emergencyContact1Relation: existingLiabilityForm.emergencyContact1Relation,
        emergencyContact2Name: existingLiabilityForm.emergencyContact2Name,
        emergencyContact2Phone: existingLiabilityForm.emergencyContact2Phone,
        emergencyContact2Relation: existingLiabilityForm.emergencyContact2Relation,
        insuranceProvider: existingLiabilityForm.insuranceProvider,
        insurancePolicyNumber: existingLiabilityForm.insurancePolicyNumber,
        insuranceGroupNumber: existingLiabilityForm.insuranceGroupNumber,
        parentEmail: existingLiabilityForm.parentEmail,
      }

      updatedLiabilityForm = await prisma.liabilityForm.update({
        where: { id: existingLiabilityForm.id },
        data: {
          participantFirstName: firstName,
          participantLastName: lastName,
          participantPreferredName: preferredName || null,
          participantAge: parseInt(age),
          participantGender: gender,
          participantEmail: email || null,
          participantPhone: liabilityFormData.participantPhone || null,
          participantType: participantType,
          tShirtSize: tShirtSize || null,
          medicalConditions: liabilityFormData.medicalConditions || null,
          medications: liabilityFormData.medications || null,
          allergies: liabilityFormData.allergies || null,
          dietaryRestrictions: liabilityFormData.dietaryRestrictions || null,
          adaAccommodations: liabilityFormData.adaAccommodations || null,
          emergencyContact1Name: liabilityFormData.emergencyContact1Name || null,
          emergencyContact1Phone: liabilityFormData.emergencyContact1Phone || null,
          emergencyContact1Relation: liabilityFormData.emergencyContact1Relation || null,
          emergencyContact2Name: liabilityFormData.emergencyContact2Name || null,
          emergencyContact2Phone: liabilityFormData.emergencyContact2Phone || null,
          emergencyContact2Relation: liabilityFormData.emergencyContact2Relation || null,
          insuranceProvider: liabilityFormData.insuranceProvider || null,
          insurancePolicyNumber: liabilityFormData.insurancePolicyNumber || null,
          insuranceGroupNumber: liabilityFormData.insuranceGroupNumber || null,
          parentEmail: liabilityFormData.parentEmail || null,
          updatedAt: new Date(),
        },
      })
    }

    // Create audit trail entry
    await prisma.auditLog.create({
      data: {
        action: 'participant_edited',
        entityType: 'participant',
        entityId: participantId,
        details: JSON.stringify({
          participantId,
          groupRegistrationId: existingParticipant.groupRegistrationId,
          oldValues,
          newValues: {
            firstName,
            lastName,
            preferredName,
            email,
            age: parseInt(age),
            gender,
            participantType,
            tShirtSize,
          },
          liabilityFormUpdated: !!updatedLiabilityForm,
          adminNotes: adminNotes || null,
        }),
        performedBy: 'admin', // In production, this should be the actual admin user ID
        timestamp: new Date(),
      },
    })

    // Send email notification if requested
    if (sendEmail && existingParticipant.groupRegistration) {
      const groupRegistration = existingParticipant.groupRegistration
      const event = groupRegistration.event

      if (groupRegistration.groupLeaderEmail) {
        try {
          // Build list of changes
          const changes: string[] = []

          if (oldValues.firstName !== firstName || oldValues.lastName !== lastName) {
            changes.push(`Name: ${oldValues.firstName} ${oldValues.lastName} → ${firstName} ${lastName}`)
          }
          if (oldValues.age !== parseInt(age)) {
            changes.push(`Age: ${oldValues.age} → ${age}`)
          }
          if (oldValues.gender !== gender) {
            changes.push(`Gender: ${oldValues.gender} → ${gender}`)
          }
          if (oldValues.participantType !== participantType) {
            changes.push(`Participant Type: ${oldValues.participantType} → ${participantType}`)
          }
          if (oldValues.tShirtSize !== tShirtSize) {
            changes.push(`T-Shirt Size: ${oldValues.tShirtSize || 'None'} → ${tShirtSize || 'None'}`)
          }
          if (oldValues.email !== email) {
            changes.push(`Email: ${oldValues.email || 'None'} → ${email || 'None'}`)
          }

          const emailSubject = `Participant Information Updated - ${event.name}`

          const emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1E3A5F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
                .info-box { background-color: white; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0; }
                .changes-list { background-color: #FFF4E6; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
                .changes-list ul { margin: 10px 0; padding-left: 20px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Participant Information Updated</h1>
                </div>
                <div class="content">
                  <p>Hello ${groupRegistration.groupLeaderName},</p>

                  <p>We wanted to notify you that participant information has been updated for one of your group members in <strong>${event.name}</strong>.</p>

                  <div class="info-box">
                    <h3 style="margin-top: 0; color: #1E3A5F;">Participant Details</h3>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                    ${preferredName ? `<p style="margin: 5px 0;"><strong>Preferred Name:</strong> ${preferredName}</p>` : ''}
                    <p style="margin: 5px 0;"><strong>Age:</strong> ${age}</p>
                    <p style="margin: 5px 0;"><strong>Type:</strong> ${participantType.replace('_', ' ')}</p>
                  </div>

                  ${changes.length > 0 ? `
                    <div class="changes-list">
                      <h3 style="margin-top: 0; color: #F59E0B;">Changes Made</h3>
                      <ul>
                        ${changes.map(change => `<li>${change}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}

                  ${adminNotes ? `
                    <div class="info-box" style="background-color: #E8F4FD;">
                      <h3 style="margin-top: 0; color: #1E3A5F;">Admin Notes</h3>
                      <p style="margin: 0;">${adminNotes}</p>
                    </div>
                  ` : ''}

                  <p>If you have any questions about these changes, please contact the event organizers.</p>

                  <p>Thank you!</p>
                </div>
                <div class="footer">
                  <p>This is an automated message from ChiRho Events.</p>
                  <p>${event.name}</p>
                </div>
              </div>
            </body>
            </html>
          `

          await resend.emails.send({
            from: 'ChiRho Events <noreply@chirhoevents.com>',
            to: groupRegistration.groupLeaderEmail,
            subject: emailSubject,
            html: emailBody,
          })
        } catch (emailError) {
          console.error('Failed to send email:', emailError)
          // Don't fail the entire request if email fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      participant: updatedParticipant,
      liabilityForm: updatedLiabilityForm,
    })
  } catch (error) {
    console.error('Error updating participant:', error)
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    )
  }
}
