import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getClerkUserIdFromRequest(request)

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

    const organizationId = await getEffectiveOrgId(user as any)

    const registrationId = id

    // Fetch the registration with all related data
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        participants: true,
        event: {
          include: {
            settings: true,
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(user, registration.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment balance separately
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    // Get payment records for this registration
    const payments = await prisma.payment.findMany({
      where: {
        registrationId: registrationId,
        registrationType: 'group',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      registration: {
        ...registration,
        paymentBalance: paymentBalance ? {
          totalAmountDue: Number(paymentBalance.totalAmountDue),
          amountPaid: Number(paymentBalance.amountPaid),
          amountRemaining: Number(paymentBalance.amountRemaining),
          paymentStatus: paymentBalance.paymentStatus,
        } : null,
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          paymentStatus: p.paymentStatus,
          checkNumber: p.checkNumber,
          checkReceivedDate: p.checkReceivedDate,
          notes: p.notes,
          createdAt: p.createdAt,
          processedAt: p.processedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching group registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getClerkUserIdFromRequest(request)

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

    const organizationId = await getEffectiveOrgId(user as any)
    const registrationId = id
    const body = await request.json()

    // Verify the registration belongs to the user's organization
    const existingRegistration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        participants: true,
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

    // Get payment balance separately
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    const {
      groupName,
      parishName,
      dioceseName,
      groupLeaderName,
      groupLeaderEmail,
      groupLeaderPhone,
      groupLeaderStreet,
      groupLeaderCity,
      groupLeaderState,
      groupLeaderZip,
      housingType,
      specialRequests,
      totalParticipants,
      youthCount,
      chaperoneCount,
      priestCount,
      adminNotes,
      oldTotal,
      newTotal,
      eventId,
    } = body

    // Calculate the difference
    const difference = newTotal - oldTotal

    // Calculate individual counts from participantCounts if provided
    // The frontend sends youth_u18 and youth_o18, we need to combine them for youthCount
    const finalYouthCount = youthCount !== undefined ? youthCount : existingRegistration.youthCount
    const finalChaperoneCount = chaperoneCount !== undefined ? chaperoneCount : existingRegistration.chaperoneCount
    const finalPriestCount = priestCount !== undefined ? priestCount : existingRegistration.priestCount

    // Update the group registration
    const updatedRegistration = await prisma.groupRegistration.update({
      where: { id: registrationId },
      data: {
        groupName,
        parishName,
        dioceseName: dioceseName || null,
        groupLeaderName,
        groupLeaderEmail,
        groupLeaderPhone,
        groupLeaderStreet: groupLeaderStreet || null,
        groupLeaderCity: groupLeaderCity || null,
        groupLeaderState: groupLeaderState || null,
        groupLeaderZip: groupLeaderZip || null,
        housingType,
        specialRequests: specialRequests || null,
        totalParticipants: totalParticipants !== undefined ? totalParticipants : existingRegistration.totalParticipants,
        youthCount: finalYouthCount,
        chaperoneCount: finalChaperoneCount,
        priestCount: finalPriestCount,
        updatedAt: new Date(),
      },
    })

    // Track changes made
    const changesMade: Record<string, {old: unknown, new: unknown}> = {}
    if (existingRegistration.groupName !== groupName) {
      changesMade.groupName = { old: existingRegistration.groupName, new: groupName }
    }
    if (existingRegistration.parishName !== parishName) {
      changesMade.parishName = { old: existingRegistration.parishName, new: parishName }
    }
    if (existingRegistration.groupLeaderName !== groupLeaderName) {
      changesMade.groupLeaderName = { old: existingRegistration.groupLeaderName, new: groupLeaderName }
    }
    if (existingRegistration.groupLeaderEmail !== groupLeaderEmail) {
      changesMade.groupLeaderEmail = { old: existingRegistration.groupLeaderEmail, new: groupLeaderEmail }
    }
    if (existingRegistration.groupLeaderPhone !== groupLeaderPhone) {
      changesMade.groupLeaderPhone = { old: existingRegistration.groupLeaderPhone, new: groupLeaderPhone }
    }
    if (existingRegistration.housingType !== housingType) {
      changesMade.housingType = { old: existingRegistration.housingType, new: housingType }
    }
    if (totalParticipants !== undefined && existingRegistration.totalParticipants !== totalParticipants) {
      changesMade.totalParticipants = { old: existingRegistration.totalParticipants, new: totalParticipants }
    }

    // Create audit trail entry if changes were made
    if (Object.keys(changesMade).length > 0 || difference !== 0) {
      await prisma.registrationEdit.create({
        data: {
          registrationId,
          registrationType: 'group',
          editedByUserId: user.id,
          editType: difference !== 0 ? 'payment_updated' : 'info_updated',
          changesMade: changesMade as any,
          oldTotal: oldTotal || null,
          newTotal: newTotal || null,
          difference: difference || null,
          adminNotes: adminNotes || null,
        },
      })
    }

    // Update payment balance if total changed
    if (difference !== 0 && paymentBalance) {
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          totalAmountDue: newTotal,
          amountRemaining: {
            increment: difference,
          },
        },
      })
    }

    // Send email notification to group leader
    if (groupLeaderEmail && existingRegistration.event) {
      try {
        // Build list of changes for email
        const emailChanges: string[] = []

        if (existingRegistration.groupName !== groupName) {
          emailChanges.push(`Group Name: ${existingRegistration.groupName} → ${groupName}`)
        }
        if (existingRegistration.parishName !== parishName) {
          emailChanges.push(`Parish Name: ${existingRegistration.parishName} → ${parishName}`)
        }
        if (existingRegistration.housingType !== housingType) {
          emailChanges.push(`Housing Type: ${existingRegistration.housingType} → ${housingType}`)
        }
        if (existingRegistration.totalParticipants !== totalParticipants) {
          emailChanges.push(`Total Participants: ${existingRegistration.totalParticipants} → ${totalParticipants}`)
        }
        if (oldTotal !== newTotal) {
          emailChanges.push(`Total Amount Due: $${oldTotal.toFixed(2)} → $${newTotal.toFixed(2)}`)
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
                  <p>Hello ${groupLeaderName},</p>

                  <p>Your group registration for <strong>${existingRegistration.event.name}</strong> has been updated by event administrators.</p>

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
            to: groupLeaderEmail,
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
    console.error('Error updating group registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
