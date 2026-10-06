import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, canAccessOrganization } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from '@/lib/resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { resolveReplyTo } from '@/lib/email-reply-to'
import { randomUUID } from 'crypto'
import { calculateIndividualPrice, individualParentTokenExpiry } from '@/lib/individual-registration'
import {
  incrementOptionCapacity,
  incrementDayPassOptionCapacity,
  reserveOptionCapacity,
  type HousingType,
  type RoomType,
} from '@/lib/option-capacity'
import { POROS_FROM, buildParentLiabilityFormEmail } from '@/lib/poros-email'

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
        ticketType: true,
        dayPassOptionId: true,
        registeredAt: true,
        emergencyContact1Name: true,
        emergencyContact1Phone: true,
        event: {
          select: {
            id: true,
            name: true,
            endDate: true,
            organizationId: true,
            pricing: true,
            organization: true,
            settings: true,
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

    // Room type only means something for on-campus housing. The edit form
    // always sends one (defaulting to "single"), so ignore it otherwise —
    // otherwise fixing a name could look like a housing change.
    const oldHousing = existingRegistration.housingType
    const oldRoom = oldHousing === 'on_campus' ? existingRegistration.roomType : null
    const newHousing = housingType || oldHousing
    const newRoom = newHousing === 'on_campus' ? (roomType || null) : null
    const optionChanged = newHousing !== oldHousing || newRoom !== oldRoom

    // Reprice by the difference between the old and new option, using the
    // prices in effect when they registered (early bird included). Applying
    // only the difference keeps any coupon discount and add-ons they had,
    // instead of resetting them to full price.
    const currentTotalAmount = paymentBalance ? Number(paymentBalance.totalAmountDue) : 0
    const currentAmountPaid = paymentBalance ? Number(paymentBalance.amountPaid) : 0
    let newTotalAmount = currentTotalAmount
    let priceChanged = false

    const pricing = existingRegistration.event.pricing
    if (optionChanged && pricing) {
      const dayPassOption = existingRegistration.dayPassOptionId
        ? await prisma.dayPassOption.findUnique({
            where: { id: existingRegistration.dayPassOptionId },
            select: { price: true },
          })
        : null
      const toPrice = (value: unknown) => (value == null ? null : Number(value))
      const priceFor = (housing: string | null, room: string | null) =>
        calculateIndividualPrice(
          {
            individualBasePrice: toPrice(pricing.individualBasePrice),
            individualEarlyBirdPrice: toPrice(pricing.individualEarlyBirdPrice),
            individualOffCampusPrice: toPrice(pricing.individualOffCampusPrice),
            individualDayPassPrice: toPrice(pricing.individualDayPassPrice),
            youthRegularPrice: toPrice(pricing.youthRegularPrice),
            singleRoomPrice: toPrice(pricing.singleRoomPrice),
            doubleRoomPrice: toPrice(pricing.doubleRoomPrice),
            tripleRoomPrice: toPrice(pricing.tripleRoomPrice),
            quadRoomPrice: toPrice(pricing.quadRoomPrice),
            earlyBirdDeadline: pricing.earlyBirdDeadline,
          },
          {
            housingType: housing || 'off_campus',
            roomType: room,
            dayPassOptionPrice: dayPassOption ? Number(dayPassOption.price) : null,
          },
          existingRegistration.registeredAt
        )
      const difference = priceFor(newHousing, newRoom) - priceFor(oldHousing, oldRoom)
      newTotalAmount = Math.max(0, Math.round((currentTotalAmount + difference) * 100) / 100)
      priceChanged = newTotalAmount !== currentTotalAmount
    }

    // Move the housing spot: take the new option first (atomically, only if
    // there's room), then give the old one back
    const eventSettings = existingRegistration.event.settings
    if (optionChanged && eventSettings) {
      if (newHousing && newHousing !== 'day_pass') {
        const taken = await reserveOptionCapacity(
          existingRegistration.eventId,
          newHousing as HousingType,
          newRoom as RoomType | null,
          1
        )
        if (!taken) {
          return NextResponse.json(
            { error: 'There are no spots left for that housing or room type. Raise its capacity in the event settings, or choose another option.' },
            { status: 400 }
          )
        }
      }
      try {
        if (oldHousing === 'day_pass') {
          if (existingRegistration.dayPassOptionId) {
            await incrementDayPassOptionCapacity(existingRegistration.dayPassOptionId, 1)
          }
        } else if (oldHousing) {
          await incrementOptionCapacity(existingRegistration.eventId, oldHousing as HousingType, oldRoom as RoomType | null, 1)
        }
      } catch (releaseError) {
        // Couldn't give the old spot back: undo taking the new one
        if (newHousing && newHousing !== 'day_pass') {
          await incrementOptionCapacity(existingRegistration.eventId, newHousing as HousingType, newRoom as RoomType | null, 1)
        }
        throw releaseError
      }
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
        housingType: newHousing || null,
        roomType: newRoom,
        ...(optionChanged ? { ticketType: newHousing === 'day_pass' ? 'day_pass' as const : 'general_admission' as const } : {}),
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

    // Update payment balance if price changed (and whether it's now paid up)
    if (priceChanged && paymentBalance) {
      const paymentStatus =
        newAmountRemaining < 0 ? 'overpaid'
          : newAmountRemaining === 0 ? 'paid_full'
            : currentAmountPaid > 0 ? 'partial'
              : paymentBalance.paymentStatus === 'pending_check_payment' ? 'pending_check_payment' : 'unpaid'
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          totalAmountDue: newTotalAmount,
          amountRemaining: newAmountRemaining,
          paymentStatus,
          updatedAt: new Date(),
        },
      })
    }

    // Youth event: if the corrected age moves them across 18, switch their
    // (not yet signed) liability form between the adult form and the
    // parent-signed youth form. A minor's parent gets the link right away.
    const newAge = parseInt(age)
    if (
      eventSettings?.liabilityFormsRequiredIndividual &&
      !Number.isNaN(newAge) &&
      existingRegistration.age !== newAge
    ) {
      const wasMinor = existingRegistration.age != null && existingRegistration.age < 18
      const isMinor = newAge < 18
      const form = await prisma.liabilityForm.findFirst({
        where: { individualRegistrationId: registrationId },
        orderBy: { createdAt: 'desc' },
      })
      if (form && !form.completed) {
        if (isMinor && !wasMinor) {
          const parentToken = randomUUID()
          const parentTokenExpiresAt = individualParentTokenExpiry(existingRegistration.event.endDate)
          await prisma.liabilityForm.update({
            where: { id: form.id },
            data: {
              formType: 'youth_u18',
              participantType: 'youth_u18',
              participantAge: newAge,
              parentEmail: email,
              parentToken,
              parentTokenExpiresAt,
              emergencyContact1Name: updatedRegistration.emergencyContact1Name,
              emergencyContact1Phone: updatedRegistration.emergencyContact1Phone,
              emergencyContact1Relation: updatedRegistration.emergencyContact1Relation,
              emergencyContact2Name: updatedRegistration.emergencyContact2Name,
              emergencyContact2Phone: updatedRegistration.emergencyContact2Phone,
              emergencyContact2Relation: updatedRegistration.emergencyContact2Relation,
            },
          })
          const parentEmail = buildParentLiabilityFormEmail({
            firstName: updatedRegistration.firstName,
            lastName: updatedRegistration.lastName,
            eventName: existingRegistration.event.name,
            parentLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/poros/parent/${parentToken}`,
            expiresAt: parentTokenExpiresAt,
          })
          try {
            await resend.emails.send({
              from: POROS_FROM,
              reply_to: resolveReplyTo(eventSettings, existingRegistration.event.organization),
              to: email,
              subject: parentEmail.subject,
              html: parentEmail.html,
            })
          } catch (emailError) {
            console.error('Failed to send parent liability link after age change:', emailError)
          }
        } else if (!isMinor && wasMinor) {
          await prisma.liabilityForm.update({
            where: { id: form.id },
            data: {
              formType: 'youth_o18_chaperone',
              participantType: null,
              participantAge: newAge,
              parentToken: null,
              parentTokenExpiresAt: null,
            },
          })
        } else {
          await prisma.liabilityForm.update({ where: { id: form.id }, data: { participantAge: newAge } })
        }
      }
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
    if (oldHousing !== newHousing) {
      changesMade.housingType = { old: oldHousing, new: newHousing }
    }
    if (oldRoom !== newRoom) {
      changesMade.roomType = { old: oldRoom, new: newRoom }
    }

    // Create audit trail entry if changes were made
    if (Object.keys(changesMade).length > 0 || priceChanged) {
      await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'individual',
          organizationId: existingRegistration.organizationId, // Fix #11
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
                  <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 180px; height: auto; margin-bottom: 12px;" />
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
            from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
            reply_to: resolveReplyTo(existingRegistration.event.settings, existingRegistration.event.organization),
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
