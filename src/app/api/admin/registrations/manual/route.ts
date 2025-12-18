import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { eventId, organizationId, registrationType, ...fields } = body

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: user.organizationId },
      include: { pricing: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (registrationType === 'individual') {
      // Create individual registration
      const registration = await prisma.individualRegistration.create({
        data: {
          eventId,
          organizationId: user.organizationId,
          firstName: fields.firstName || 'N/A',
          lastName: fields.lastName || 'N/A',
          email: fields.email || `manual-${Date.now()}@placeholder.com`,
          phone: fields.phone || 'N/A',
          age: fields.age ? parseInt(fields.age) : null,
          gender: fields.gender || null,
          street: fields.street || null,
          city: fields.city || null,
          state: fields.state || null,
          zip: fields.zip || null,
          housingType: fields.housingType || 'on_campus',
          dietaryRestrictions: fields.dietaryRestrictions || null,
          adaAccommodations: fields.adaAccommodations || null,
          emergencyContact1Name: 'N/A',
          emergencyContact1Phone: 'N/A',
          registrationStatus: 'complete',
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
          organizationId: user.organizationId,
          registrationId: registration.id,
          registrationType: 'individual',
          totalAmountDue: price,
          amountPaid: 0,
          amountRemaining: price,
          paymentStatus: 'unpaid',
        },
      })

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
          organizationId: user.organizationId,
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
          organizationId: user.organizationId,
          registrationId: registration.id,
          registrationType: 'group',
          totalAmountDue: totalAmount,
          amountPaid: 0,
          amountRemaining: totalAmount,
          paymentStatus: totalAmount > 0 ? 'unpaid' : 'paid_full',
        },
      })

      // Send email notification with access code if email is provided
      if (fields.groupLeaderEmail && !fields.groupLeaderEmail.includes('placeholder.com')) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
            to: fields.groupLeaderEmail,
            subject: `Manual Registration Created - ${event.name}`,
            html: `
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
            `,
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
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
