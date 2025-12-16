import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const registrationId = params.id
    const body = await request.json()

    // Verify the registration belongs to the user's organization
    const existingRegistration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (existingRegistration.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      firstName,
      lastName,
      preferredName,
      email,
      phone,
      age,
      gender,
      street,
      city,
      state,
      zip,
      housingType,
      roomType,
      tShirtSize,
      preferredRoommate,
      dietaryRestrictions,
      adaAccommodations,
      adminNotes,
    } = body

    // Update the individual registration
    const updatedRegistration = await prisma.individualRegistration.update({
      where: { id: registrationId },
      data: {
        firstName,
        lastName,
        preferredName: preferredName || null,
        email,
        phone: phone || null,
        age: parseInt(age),
        gender: gender || null,
        street: street || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        housingType: housingType || null,
        roomType: roomType || null,
        tShirtSize: tShirtSize || null,
        preferredRoommate: preferredRoommate || null,
        dietaryRestrictions: dietaryRestrictions || null,
        adaAccommodations: adaAccommodations || null,
        updatedAt: new Date(),
      },
    })

    // Track changes made
    const changesMade: Record<string, {old: unknown, new: unknown}> = {}
    if (existingRegistration.firstName !== firstName) {
      changesMade.firstName = { old: existingRegistration.firstName, new: firstName }
    }
    if (existingRegistration.lastName !== lastName) {
      changesMade.lastName = { old: existingRegistration.lastName, new: lastName }
    }
    if (existingRegistration.email !== email) {
      changesMade.email = { old: existingRegistration.email, new: email }
    }
    if (existingRegistration.phone !== phone) {
      changesMade.phone = { old: existingRegistration.phone, new: phone }
    }
    if (existingRegistration.age !== age) {
      changesMade.age = { old: existingRegistration.age, new: age }
    }
    if (existingRegistration.housingType !== housingType) {
      changesMade.housingType = { old: existingRegistration.housingType, new: housingType }
    }

    // Create audit trail entry if changes were made
    if (Object.keys(changesMade).length > 0) {
      await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'individual',
          editedByUserId: user.id,
          editType: 'info_updated',
          changesMade: changesMade as any,
          adminNotes: adminNotes || null,
        },
      })
    }

    // Send email notification
    if (email && existingRegistration.event) {
      try {
        // Build list of changes for email
        const emailChanges: string[] = []

        if (existingRegistration.firstName !== firstName || existingRegistration.lastName !== lastName) {
          emailChanges.push(`Name: ${existingRegistration.firstName} ${existingRegistration.lastName} → ${firstName} ${lastName}`)
        }
        if (existingRegistration.age !== parseInt(age)) {
          emailChanges.push(`Age: ${existingRegistration.age} → ${age}`)
        }
        if (existingRegistration.housingType !== housingType) {
          emailChanges.push(`Housing Type: ${existingRegistration.housingType || 'None'} → ${housingType || 'None'}`)
        }

        if (emailChanges.length > 0) {
          const emailSubject = `Registration Updated - ${existingRegistration.event.name}`

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
                  <h1>Registration Updated</h1>
                </div>
                <div class="content">
                  <p>Hello ${firstName} ${lastName},</p>

                  <p>Your registration for <strong>${existingRegistration.event.name}</strong> has been updated by event administrators.</p>

                  <div class="changes-list">
                    <h3 style="margin-top: 0; color: #F59E0B;">Changes Made</h3>
                    <ul>
                      ${emailChanges.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                  </div>

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
                  <p>${existingRegistration.event.name}</p>
                </div>
              </div>
            </body>
            </html>
          `

          await resend.emails.send({
            from: 'ChiRho Events <noreply@chirhoevents.com>',
            to: email,
            subject: emailSubject,
            html: emailBody,
          })
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      registration: updatedRegistration,
    })
  } catch (error) {
    console.error('Error updating individual registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
