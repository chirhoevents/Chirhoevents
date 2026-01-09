import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Authenticate the user
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to edit your registration' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const {
      registrationId,
      groupLeaderName,
      groupLeaderEmail,
      groupLeaderPhone,
      groupLeaderStreet,
      groupLeaderCity,
      groupLeaderState,
      groupLeaderZip,
      specialRequests,
    } = body

    // Validate required fields
    if (!registrationId || !groupLeaderName || !groupLeaderEmail || !groupLeaderPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: registrationId, groupLeaderName, groupLeaderEmail, groupLeaderPhone' },
        { status: 400 }
      )
    }

    // Get existing registration
    const existingRegistration = await prisma.groupRegistration.findUnique({
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

    // SECURITY: Verify the user owns this registration
    if (existingRegistration.clerkUserId !== userId) {
      console.error(`[Registration Edit] ❌ User ${userId} attempted to edit registration ${registrationId} owned by ${existingRegistration.clerkUserId}`)
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit this registration' },
        { status: 403 }
      )
    }

    // Store old values for change tracking
    const oldValues = {
      groupLeaderName: existingRegistration.groupLeaderName,
      groupLeaderEmail: existingRegistration.groupLeaderEmail,
      groupLeaderPhone: existingRegistration.groupLeaderPhone,
      groupLeaderStreet: existingRegistration.groupLeaderStreet,
      groupLeaderCity: existingRegistration.groupLeaderCity,
      groupLeaderState: existingRegistration.groupLeaderState,
      groupLeaderZip: existingRegistration.groupLeaderZip,
      specialRequests: existingRegistration.specialRequests,
    }

    // Update ONLY the allowed fields - group leader contact info and special requests
    // Explicitly NOT updating: groupName, parishName, dioceseName, housingType, counts
    const updatedRegistration = await prisma.groupRegistration.update({
      where: { id: registrationId },
      data: {
        groupLeaderName,
        groupLeaderEmail,
        groupLeaderPhone,
        groupLeaderStreet: groupLeaderStreet || null,
        groupLeaderCity: groupLeaderCity || null,
        groupLeaderState: groupLeaderState || null,
        groupLeaderZip: groupLeaderZip || null,
        specialRequests: specialRequests || null,
        updatedAt: new Date(),
      },
    })

    // Send confirmation email
    if (groupLeaderEmail && existingRegistration.event) {
      try {
        // Build list of changes
        const changes: string[] = []

        if (oldValues.groupLeaderName !== groupLeaderName) {
          changes.push(`Your Name: ${oldValues.groupLeaderName} → ${groupLeaderName}`)
        }
        if (oldValues.groupLeaderEmail !== groupLeaderEmail) {
          changes.push(`Email: ${oldValues.groupLeaderEmail} → ${groupLeaderEmail}`)
        }
        if (oldValues.groupLeaderPhone !== groupLeaderPhone) {
          changes.push(`Phone: ${oldValues.groupLeaderPhone} → ${groupLeaderPhone}`)
        }

        const oldAddress = [oldValues.groupLeaderStreet, oldValues.groupLeaderCity, oldValues.groupLeaderState, oldValues.groupLeaderZip].filter(Boolean).join(', ')
        const newAddress = [groupLeaderStreet, groupLeaderCity, groupLeaderState, groupLeaderZip].filter(Boolean).join(', ')
        if (oldAddress !== newAddress) {
          changes.push(`Address: ${oldAddress || 'None'} → ${newAddress || 'None'}`)
        }

        if (oldValues.specialRequests !== specialRequests) {
          changes.push(`Special Requests updated`)
        }

        const emailSubject = `You Updated Your Registration - ${existingRegistration.event.name}`

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
              .changes-list { background-color: #E8F4FD; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0; }
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
                <p>Hello ${groupLeaderName},</p>

                <p>You have successfully updated your registration information for <strong>${existingRegistration.event.name}</strong>.</p>

                <div class="info-box">
                  <h3 style="margin-top: 0; color: #1E3A5F;">Your Current Information</h3>
                  <p style="margin: 5px 0;"><strong>Group:</strong> ${existingRegistration.groupName}</p>
                  <p style="margin: 5px 0;"><strong>Parish:</strong> ${existingRegistration.parishName}</p>
                  <p style="margin: 5px 0;"><strong>Contact Name:</strong> ${groupLeaderName}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${groupLeaderEmail}</p>
                  <p style="margin: 5px 0;"><strong>Phone:</strong> ${groupLeaderPhone}</p>
                  ${newAddress ? `<p style="margin: 5px 0;"><strong>Address:</strong> ${newAddress}</p>` : ''}
                </div>

                ${changes.length > 0 ? `
                  <div class="changes-list">
                    <h3 style="margin-top: 0; color: #1E3A5F;">Changes You Made</h3>
                    <ul>
                      ${changes.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                <p>If you did not make these changes or have any questions, please contact the event organizers immediately.</p>

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
          to: groupLeaderEmail,
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
    console.error('Error updating group leader registration:', error)
    return NextResponse.json(
      { error: 'Failed to update registration' },
      { status: 500 }
    )
  }
}
