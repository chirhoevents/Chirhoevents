import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

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
      t_shirt_size,
      parent_email,
    } = body

    // Validate required fields
    if (!access_code || !first_name || !last_name || !age || !gender || !t_shirt_size || !parent_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate age is between 12-17
    if (age < 12 || age > 17) {
      return NextResponse.json(
        { error: 'Age must be between 12 and 17 for Youth Under 18 forms' },
        { status: 400 }
      )
    }

    // Find group registration by access code
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { accessCode: access_code },
      include: {
        event: true,
        organization: true,
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 404 }
      )
    }

    // Generate parent token (expires in 7 days)
    const parentToken = randomUUID()
    const parentTokenExpiresAt = new Date()
    parentTokenExpiresAt.setDate(parentTokenExpiresAt.getDate() + 7)

    // Create liability form record
    const liabilityForm = await prisma.liabilityForm.create({
      data: {
        organizationId: groupRegistration.organizationId,
        eventId: groupRegistration.eventId,
        formType: 'youth_u18',
        participantFirstName: first_name,
        participantLastName: last_name,
        participantAge: age,
        participantGender: gender,
        participantEmail: null,
        parentEmail: parent_email,
        parentToken: parentToken,
        parentTokenExpiresAt: parentTokenExpiresAt,
        signatureData: {}, // Will be filled by parent
        completed: false,
      },
    })

    // Send email to parent
    const parentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/poros/parent/${parentToken}`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
      to: parent_email,
      subject: `Complete Liability Form for ${first_name} ${last_name} - ${groupRegistration.event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <!-- ChiRho Events Logo Header -->
          <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/Poros logo.png" alt="ChiRho Events" style="max-width: 250px; height: auto;" />
          </div>

          <div style="padding: 30px 20px;">
            <h1 style="color: #1E3A5F; margin-top: 0;">Complete Liability Form</h1>

            <p>Hi,</p>

            <p><strong>${first_name} ${last_name}</strong> has started registration for <strong>${groupRegistration.event.name}</strong> and needs you to complete their liability form.</p>

            <p>This form includes:</p>
            <ul>
              <li>Medical information</li>
              <li>Emergency contacts</li>
              <li>Insurance information</li>
              <li>Consent sections</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${parentLink}" style="display: inline-block; padding: 15px 30px; background-color: #1E3A5F; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Complete Form
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${parentLink}" style="color: #1E3A5F;">${parentLink}</a>
            </p>

            <div style="background-color: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ⏰ This link expires in 7 days.
              </p>
            </div>

            <p style="font-size: 14px; color: #666;">
              If you didn't expect this email, please contact the event organizer at ${groupRegistration.groupLeaderEmail}.
            </p>

            <p>Pax Christi,<br><strong>ChiRho Events Team</strong></p>

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
      message: 'Email sent to parent successfully',
      form_id: liabilityForm.id,
    })
  } catch (error) {
    console.error('Youth U18 initiate error:', error)
    return NextResponse.json(
      { error: 'Failed to process form. Please try again.' },
      { status: 500 }
    )
  }
}
