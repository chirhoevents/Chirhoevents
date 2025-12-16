import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function PUT(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const registrationId = params.registrationId
    const body = await request.json()

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

    // Validate required fields
    if (!firstName || !lastName || !email || !age) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, age' },
        { status: 400 }
      )
    }

    // Get existing registration
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

    // Store old values for change tracking
    const oldValues = {
      firstName: existingRegistration.firstName,
      lastName: existingRegistration.lastName,
      preferredName: existingRegistration.preferredName,
      email: existingRegistration.email,
      phone: existingRegistration.phone,
      age: existingRegistration.age,
      gender: existingRegistration.gender,
      street: existingRegistration.street,
      city: existingRegistration.city,
      state: existingRegistration.state,
      zip: existingRegistration.zip,
      housingType: existingRegistration.housingType,
      roomType: existingRegistration.roomType,
      tShirtSize: existingRegistration.tShirtSize,
      preferredRoommate: existingRegistration.preferredRoommate,
      dietaryRestrictions: existingRegistration.dietaryRestrictions,
      adaAccommodations: existingRegistration.adaAccommodations,
    }

    // Update individual registration
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

    // Send email notification
    if (email && existingRegistration.event) {
      try {
        // Build list of changes
        const changes: string[] = []

        if (oldValues.firstName !== firstName || oldValues.lastName !== lastName) {
          changes.push(`Name: ${oldValues.firstName} ${oldValues.lastName} → ${firstName} ${lastName}`)
        }
        if (oldValues.preferredName !== preferredName) {
          changes.push(`Preferred Name: ${oldValues.preferredName || 'None'} → ${preferredName || 'None'}`)
        }
        if (oldValues.email !== email) {
          changes.push(`Email: ${oldValues.email} → ${email}`)
        }
        if (oldValues.phone !== phone) {
          changes.push(`Phone: ${oldValues.phone || 'None'} → ${phone || 'None'}`)
        }
        if (oldValues.age !== parseInt(age)) {
          changes.push(`Age: ${oldValues.age} → ${age}`)
        }
        if (oldValues.gender !== gender) {
          changes.push(`Gender: ${oldValues.gender || 'None'} → ${gender || 'None'}`)
        }
        if (oldValues.housingType !== housingType) {
          changes.push(`Housing Type: ${oldValues.housingType || 'None'} → ${housingType || 'None'}`)
        }
        if (oldValues.roomType !== roomType) {
          changes.push(`Room Type: ${oldValues.roomType || 'None'} → ${roomType || 'None'}`)
        }
        if (oldValues.tShirtSize !== tShirtSize) {
          changes.push(`T-Shirt Size: ${oldValues.tShirtSize || 'None'} → ${tShirtSize || 'None'}`)
        }

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

                <div class="info-box">
                  <h3 style="margin-top: 0; color: #1E3A5F;">Updated Registration Details</h3>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                  ${preferredName ? `<p style="margin: 5px 0;"><strong>Preferred Name:</strong> ${preferredName}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Age:</strong> ${age}</p>
                  ${housingType ? `<p style="margin: 5px 0;"><strong>Housing Type:</strong> ${housingType.replace('_', ' ')}</p>` : ''}
                  ${roomType ? `<p style="margin: 5px 0;"><strong>Room Type:</strong> ${roomType}</p>` : ''}
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
      { error: 'Failed to update individual registration' },
      { status: 500 }
    )
  }
}
