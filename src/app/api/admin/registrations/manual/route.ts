import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { generateIndividualConfirmationCode } from '@/lib/access-code'
import { isAdminRole } from '@/lib/permissions'
// UserRole type is handled by isAdminRole function

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || !isAdminRole(user.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const body = await request.json()
    const { eventId, registrationType, ...fields } = body

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: organizationId },
      include: { pricing: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (registrationType === 'individual') {
      // Generate unique confirmation code
      const eventYear = event.name.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()
      let confirmationCode = generateIndividualConfirmationCode(eventYear)

      // Ensure uniqueness (try up to 5 times)
      let attempts = 0
      while (attempts < 5) {
        const existingCode = await prisma.individualRegistration.findUnique({
          where: { confirmationCode },
        })
        if (!existingCode) break
        confirmationCode = generateIndividualConfirmationCode(eventYear)
        attempts++
      }

      // Create individual registration
      const registration = await prisma.individualRegistration.create({
        data: {
          eventId,
          organizationId: organizationId,
          firstName: fields.firstName || 'N/A',
          lastName: fields.lastName || 'N/A',
          preferredName: fields.preferredName || null,
          email: fields.email || `manual-${Date.now()}@placeholder.com`,
          phone: fields.phone || 'N/A',
          age: fields.age ? parseInt(fields.age) : null,
          gender: fields.gender || null,
          street: fields.street || null,
          city: fields.city || null,
          state: fields.state || null,
          zip: fields.zip || null,
          housingType: fields.housingType || 'on_campus',
          roomType: fields.roomType || 'double',
          preferredRoommate: fields.preferredRoommate || null,
          tShirtSize: fields.tShirtSize || null,
          dietaryRestrictions: fields.dietaryRestrictions || null,
          adaAccommodations: fields.adaAccommodations || null,
          emergencyContact1Name: fields.emergencyContact1Name || 'N/A',
          emergencyContact1Phone: fields.emergencyContact1Phone || 'N/A',
          emergencyContact1Relation: fields.emergencyContact1Relation || null,
          emergencyContact2Name: fields.emergencyContact2Name || null,
          emergencyContact2Phone: fields.emergencyContact2Phone || null,
          emergencyContact2Relation: fields.emergencyContact2Relation || null,
          registrationStatus: 'complete',
          confirmationCode,
        },
      })

      // Calculate price based on housing type
      let price = event.pricing?.youthRegularPrice || 0
      if (fields.housingType === 'on_campus' && event.pricing?.onCampusYouthPrice) {
        price = event.pricing.onCampusYouthPrice
      } else if (fields.housingType === 'off_campus' && event.pricing?.offCampusYouthPrice) {
        price = event.pricing.offCampusYouthPrice
      } else if (fields.housingType === 'day_pass' && event.pricing?.dayPassYouthPrice) {
        price = event.pricing.dayPassYouthPrice
      }

      // Create payment balance
      await prisma.paymentBalance.create({
        data: {
          eventId,
          organizationId: organizationId,
          registrationId: registration.id,
          registrationType: 'individual',
          totalAmountDue: price,
          amountPaid: 0,
          amountRemaining: price,
          paymentStatus: 'unpaid',
        },
      })

      // Update event capacity if capacity tracking is enabled (individual = 1 participant)
      if (event.capacityTotal !== null && event.capacityRemaining !== null) {
        await prisma.event.update({
          where: { id: eventId },
          data: {
            capacityRemaining: Math.max(0, event.capacityRemaining - 1),
          },
        })
      }

      // Send email notification if email is provided and not a placeholder
      if (fields.email && !fields.email.includes('placeholder.com')) {
        const emailSubject = `Manual Registration Created - ${event.name}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- ChiRho Events Logo Header -->
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F; margin-top: 0;">Registration Created</h1>

              <p>A manual registration has been created for you for <strong>${event.name}</strong>.</p>

              <div style="background-color: #E8F4F8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #1E3A5F;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Your Confirmation Code</h2>
                <div style="background-color: white; padding: 15px; border-radius: 5px; display: inline-block; margin: 10px 0;">
                  <span style="font-size: 28px; font-weight: bold; color: #1E3A5F; letter-spacing: 2px; font-family: 'Courier New', monospace;">${confirmationCode}</span>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                  Keep this code safe! You'll need it for payments and to look up your registration.
                </p>
              </div>

              <h3 style="color: #1E3A5F;">Registration Summary</h3>
              <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
                <p style="margin: 5px 0;"><strong>Name:</strong> ${fields.firstName} ${fields.lastName}</p>
                ${fields.preferredName ? `<p style="margin: 5px 0;"><strong>Preferred Name:</strong> ${fields.preferredName}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Email:</strong> ${fields.email}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${fields.phone || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Housing Type:</strong> ${(fields.housingType || 'on_campus').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                <p style="margin: 5px 0;"><strong>Total Amount Due:</strong> $${price.toFixed(2)}</p>
              </div>

              <h3 style="color: #1E3A5F;">Next Steps:</h3>
              <ol>
                <li><strong>Payment:</strong> Contact the event organizer regarding payment arrangements.</li>
                <li><strong>Check-In:</strong> Bring a photo ID to check in at the event.</li>
              </ol>

              <p>Questions? Reply to this email or contact the event organizer.</p>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                © 2025 ChiRho Events. All rights reserved.
              </p>
            </div>
          </div>
        `

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
            to: fields.email,
            subject: emailSubject,
            html: emailHtml,
          })

          // Log the email
          await logEmail({
            organizationId: organizationId,
            eventId,
            registrationId: registration.id,
            registrationType: 'individual',
            recipientEmail: fields.email,
            recipientName: `${fields.firstName} ${fields.lastName}`,
            emailType: 'manual_individual_registration_created',
            subject: emailSubject,
            htmlContent: emailHtml,
            metadata: {
              firstName: fields.firstName,
              lastName: fields.lastName,
              housingType: fields.housingType,
              totalAmount: price,
              confirmationCode,
            },
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
          await logEmailFailure(
            {
              organizationId: organizationId,
              eventId,
              registrationId: registration.id,
              registrationType: 'individual',
              recipientEmail: fields.email,
              recipientName: `${fields.firstName} ${fields.lastName}`,
              emailType: 'manual_individual_registration_created',
              subject: emailSubject,
              htmlContent: emailHtml,
            },
            emailError instanceof Error ? emailError.message : 'Unknown error'
          )
          // Don't fail the registration if email fails
        }
      }

      return NextResponse.json({ success: true, registration })
    } else {
      // Create group registration
      const youthCount = fields.youthCount ? parseInt(fields.youthCount) : 0
      const chaperoneCount = fields.chaperoneCount ? parseInt(fields.chaperoneCount) : 0
      const priestCount = fields.priestCount ? parseInt(fields.priestCount) : 0
      const totalParticipants = youthCount + chaperoneCount + priestCount

      // Calculate pricing based on participant counts and housing type
      const housingType = fields.housingType || 'on_campus'

      // Determine youth price based on housing type
      let youthPrice = Number(event.pricing?.youthRegularPrice || 0)
      if (housingType === 'on_campus' && event.pricing?.onCampusYouthPrice) {
        youthPrice = Number(event.pricing.onCampusYouthPrice)
      } else if (housingType === 'off_campus' && event.pricing?.offCampusYouthPrice) {
        youthPrice = Number(event.pricing.offCampusYouthPrice)
      } else if (housingType === 'day_pass' && event.pricing?.dayPassYouthPrice) {
        youthPrice = Number(event.pricing.dayPassYouthPrice)
      }

      // Determine chaperone price based on housing type
      let chaperonePrice = Number(event.pricing?.chaperoneRegularPrice || 0)
      if (housingType === 'on_campus' && event.pricing?.onCampusChaperonePrice) {
        chaperonePrice = Number(event.pricing.onCampusChaperonePrice)
      } else if (housingType === 'off_campus' && event.pricing?.offCampusChaperonePrice) {
        chaperonePrice = Number(event.pricing.offCampusChaperonePrice)
      } else if (housingType === 'day_pass' && event.pricing?.dayPassChaperonePrice) {
        chaperonePrice = Number(event.pricing.dayPassChaperonePrice)
      }

      const priestPrice = Number(event.pricing?.priestPrice || 0)

      // Calculate total amount
      const totalAmount =
        (youthCount * youthPrice) +
        (chaperoneCount * chaperonePrice) +
        (priestCount * priestPrice)

      const registration = await prisma.groupRegistration.create({
        data: {
          eventId,
          organizationId: organizationId,
          groupName: fields.groupName || 'Manual Group',
          parishName: fields.parishName || null,
          groupLeaderName: fields.groupLeaderName || 'N/A',
          groupLeaderEmail: fields.groupLeaderEmail || `manual-group-${Date.now()}@placeholder.com`,
          groupLeaderPhone: fields.groupLeaderPhone || 'N/A',
          groupLeaderStreet: fields.street || null,
          groupLeaderCity: fields.city || null,
          groupLeaderState: fields.state || null,
          groupLeaderZip: fields.zip || null,
          alternativeContact1Name: fields.alternativeContact1Name || null,
          alternativeContact1Email: fields.alternativeContact1Email || null,
          alternativeContact1Phone: fields.alternativeContact1Phone || null,
          housingType,
          totalParticipants,
          youthCount,
          chaperoneCount,
          priestCount,
          accessCode: `MANUAL-${Date.now()}`,
          specialRequests: fields.specialRequests || null,
          registrationStatus: 'complete',
        },
      })

      // Create payment balance with calculated amount
      await prisma.paymentBalance.create({
        data: {
          eventId,
          organizationId: organizationId,
          registrationId: registration.id,
          registrationType: 'group',
          totalAmountDue: totalAmount,
          amountPaid: 0,
          amountRemaining: totalAmount,
          paymentStatus: totalAmount > 0 ? 'unpaid' : 'paid_full',
        },
      })

      // Update event capacity if capacity tracking is enabled
      if (event.capacityTotal !== null && event.capacityRemaining !== null) {
        await prisma.event.update({
          where: { id: eventId },
          data: {
            capacityRemaining: Math.max(0, event.capacityRemaining - totalParticipants),
          },
        })
      }

      // Send email notification with access code if email is provided
      if (fields.groupLeaderEmail && !fields.groupLeaderEmail.includes('placeholder.com')) {
        const emailSubject = `Manual Registration Created - ${event.name}`
        const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <!-- ChiRho Events Logo Header -->
                <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
                  <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
                </div>

                <div style="padding: 30px 20px;">
                  <h1 style="color: #1E3A5F; margin-top: 0;">Manual Registration Created</h1>

                  <p>A manual registration has been created for <strong>${registration.groupName}</strong> for ${event.name}.</p>

                  <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #9C8466; margin-top: 0;">Your Access Code</h2>
                    <p style="font-size: 24px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 2px;">
                      ${registration.accessCode}
                    </p>
                    <p style="font-size: 14px; color: #666;">
                      Save this code! You'll need it to complete liability forms and access your group portal.
                    </p>
                  </div>

                  <h3 style="color: #1E3A5F;">Registration Summary</h3>
                  <div style="background-color: #F5F5F5; padding: 15px; border-radius: 8px;">
                    <p style="margin: 5px 0;"><strong>Group:</strong> ${registration.groupName}</p>
                    ${registration.parishName ? `<p style="margin: 5px 0;"><strong>Parish:</strong> ${registration.parishName}</p>` : ''}
                    <p style="margin: 5px 0;"><strong>Group Leader:</strong> ${registration.groupLeaderName}</p>
                    <p style="margin: 5px 0;"><strong>Expected Participants:</strong> ${totalParticipants}</p>
                    ${youthCount > 0 ? `<p style="margin: 5px 0 5px 20px;">Youth: ${youthCount}</p>` : ''}
                    ${chaperoneCount > 0 ? `<p style="margin: 5px 0 5px 20px;">Chaperones: ${chaperoneCount}</p>` : ''}
                    ${priestCount > 0 ? `<p style="margin: 5px 0 5px 20px;">Priests: ${priestCount}</p>` : ''}
                    <p style="margin: 5px 0;"><strong>Housing Type:</strong> ${housingType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                    <p style="margin: 5px 0;"><strong>Total Amount Due:</strong> $${totalAmount.toFixed(2)}</p>
                  </div>

                  <h3 style="color: #1E3A5F;">Next Steps:</h3>
                  <ol>
                    <li><strong>Complete Liability Forms:</strong> Each participant must complete their liability form using your access code.</li>
                    <li><strong>Payment:</strong> Contact the event organizer regarding payment arrangements.</li>
                    <li><strong>Check-In:</strong> Bring your access code to check in at the event.</li>
                  </ol>

                  <p>Questions? Reply to this email or contact the event organizer.</p>

                  <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    © 2025 ChiRho Events. All rights reserved.
                  </p>
                </div>
              </div>
            `

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
            to: fields.groupLeaderEmail,
            subject: emailSubject,
            html: emailHtml,
          })

          // Log the email
          await logEmail({
            organizationId: organizationId,
            eventId,
            registrationId: registration.id,
            registrationType: 'group',
            recipientEmail: fields.groupLeaderEmail,
            recipientName: fields.groupLeaderName,
            emailType: 'manual_group_registration_created',
            subject: emailSubject,
            htmlContent: emailHtml,
            metadata: {
              groupName: fields.groupName,
              totalParticipants,
              totalAmount,
              accessCode: registration.accessCode,
            },
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
          await logEmailFailure(
            {
              organizationId: organizationId,
              eventId,
              registrationId: registration.id,
              registrationType: 'group',
              recipientEmail: fields.groupLeaderEmail,
              recipientName: fields.groupLeaderName,
              emailType: 'manual_group_registration_created',
              subject: emailSubject,
              htmlContent: emailHtml,
            },
            emailError instanceof Error ? emailError.message : 'Unknown error'
          )
          // Don't fail the registration if email fails
        }
      }

      return NextResponse.json({ success: true, registration })
    }
  } catch (error) {
    console.error('Error creating manual registration:', error)
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    )
  }
}
