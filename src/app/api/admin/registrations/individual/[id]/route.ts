import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const registrationId = id
    const body = await request.json()

    // Verify the registration belongs to the user's organization
    const existingRegistration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        organizationId: true,
        eventId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        age: true,
        housingType: true,
        roomType: true,
        emergencyContact1Name: true,
        emergencyContact1Phone: true,
        event: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            pricing: true,
          },
        },
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(user, existingRegistration.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch payment balance separately
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: { registrationId: registrationId },
    })

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
      emergencyContact1Name,
      emergencyContact1Phone,
      emergencyContact1Relation,
      emergencyContact2Name,
      emergencyContact2Phone,
      emergencyContact2Relation,
      adminNotes,
    } = body

    // Calculate new price if housing type or room type changed
    const currentTotalAmount = paymentBalance ? Number(paymentBalance.totalAmountDue) : 0
    const currentAmountPaid = paymentBalance ? Number(paymentBalance.amountPaid) : 0
    let newTotalAmount = currentTotalAmount
    let priceChanged = false

    if ((housingType !== existingRegistration.housingType || roomType !== existingRegistration.roomType) &&
        existingRegistration.event.pricing) {
      const pricing = existingRegistration.event.pricing

      // Calculate price based on housing type
      if (housingType === 'on_campus') {
        // Base price plus room price
        const basePrice = pricing.individualBasePrice ? Number(pricing.individualBasePrice) : 0
        let roomPrice = 0

        if (roomType === 'single' && pricing.singleRoomPrice) {
          roomPrice = Number(pricing.singleRoomPrice)
        } else if (roomType === 'double' && pricing.doubleRoomPrice) {
          roomPrice = Number(pricing.doubleRoomPrice)
        } else if (roomType === 'triple' && pricing.tripleRoomPrice) {
          roomPrice = Number(pricing.tripleRoomPrice)
        } else if (roomType === 'quad' && pricing.quadRoomPrice) {
          roomPrice = Number(pricing.quadRoomPrice)
        } else if (roomType === 'shared') {
          // Use triple price for shared if available
          roomPrice = pricing.tripleRoomPrice ? Number(pricing.tripleRoomPrice) : 0
        }

        newTotalAmount = basePrice + roomPrice
      } else if (housingType === 'off_campus' && pricing.individualOffCampusPrice) {
        newTotalAmount = Number(pricing.individualOffCampusPrice)
      } else if (housingType === 'day_pass') {
        // Use day pass price if available, otherwise fall back to off-campus price
        if (pricing.individualDayPassPrice) {
          newTotalAmount = Number(pricing.individualDayPassPrice)
        } else if (pricing.individualOffCampusPrice) {
          newTotalAmount = Number(pricing.individualOffCampusPrice)
        }
      }

      priceChanged = newTotalAmount !== currentTotalAmount
    }

    // Calculate new balance if price changed
    const newAmountRemaining = priceChanged
      ? newTotalAmount - currentAmountPaid
      : (paymentBalance ? Number(paymentBalance.amountRemaining) : 0)

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
        emergencyContact1Name: emergencyContact1Name || existingRegistration.emergencyContact1Name,
        emergencyContact1Phone: emergencyContact1Phone || existingRegistration.emergencyContact1Phone,
        emergencyContact1Relation: emergencyContact1Relation || null,
        emergencyContact2Name: emergencyContact2Name || null,
        emergencyContact2Phone: emergencyContact2Phone || null,
        emergencyContact2Relation: emergencyContact2Relation || null,
        updatedAt: new Date(),
      },
    })

    // Update payment balance if price changed
    if (priceChanged && paymentBalance) {
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          totalAmountDue: newTotalAmount,
          amountRemaining: newAmountRemaining,
          updatedAt: new Date(),
        },
      })
    }

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
    if (Object.keys(changesMade).length > 0 || priceChanged) {
      await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'individual',
          editedByUserId: user.id,
          editType: priceChanged ? 'payment_updated' : 'info_updated',
          changesMade: changesMade as any,
          oldTotal: priceChanged ? currentTotalAmount : null,
          newTotal: priceChanged ? newTotalAmount : null,
          difference: priceChanged ? (newTotalAmount - currentTotalAmount) : null,
          adminNotes: adminNotes || null,
        },
      })
    }

    // Send email notification
    if (email && existingRegistration.event) {
      // Build list of changes for email
      const emailChanges: string[] = []

      try {
        if (existingRegistration.firstName !== firstName || existingRegistration.lastName !== lastName) {
          emailChanges.push(`Name: ${existingRegistration.firstName} ${existingRegistration.lastName} → ${firstName} ${lastName}`)
        }
        if (existingRegistration.age !== parseInt(age)) {
          emailChanges.push(`Age: ${existingRegistration.age} → ${age}`)
        }
        if (existingRegistration.housingType !== housingType) {
          emailChanges.push(`Housing Type: ${existingRegistration.housingType || 'None'} → ${housingType || 'None'}`)
        }
        if (priceChanged) {
          emailChanges.push(`Total Amount: $${currentTotalAmount.toFixed(2)} → $${newTotalAmount.toFixed(2)}`)
          emailChanges.push(`New Balance: $${newAmountRemaining.toFixed(2)}`)
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

          // Log the email
          await logEmail({
            organizationId: organizationId,
            eventId: existingRegistration.event.id,
            registrationId,
            registrationType: 'individual',
            recipientEmail: email,
            recipientName: `${firstName} ${lastName}`,
            emailType: 'registration_updated',
            subject: emailSubject,
            htmlContent: emailBody,
            metadata: {
              changesMade: emailChanges,
              editedByUserId: user.id,
            },
          })
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError)

        // Log email failure
        if (emailChanges.length > 0) {
          await logEmailFailure({
            organizationId: organizationId,
            eventId: existingRegistration.event.id,
            registrationId,
            registrationType: 'individual',
            recipientEmail: email,
            recipientName: `${firstName} ${lastName}`,
            emailType: 'registration_updated',
            subject: existingRegistration.event ? `Registration Updated - ${existingRegistration.event.name}` : 'Registration Updated',
            htmlContent: '',
          }, emailError instanceof Error ? emailError.message : 'Unknown error')
        }

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
