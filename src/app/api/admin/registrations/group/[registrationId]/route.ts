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
      eventId,
      oldTotal,
      newTotal,
      adminNotes,
    } = body

    // Validate required fields
    if (!groupName || !parishName || !groupLeaderName || !groupLeaderEmail || !groupLeaderPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get existing registration
    const existingRegistration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        paymentBalance: true,
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
      groupName: existingRegistration.groupName,
      parishName: existingRegistration.parishName,
      dioceseName: existingRegistration.dioceseName,
      groupLeaderName: existingRegistration.groupLeaderName,
      groupLeaderEmail: existingRegistration.groupLeaderEmail,
      groupLeaderPhone: existingRegistration.groupLeaderPhone,
      groupLeaderStreet: existingRegistration.groupLeaderStreet,
      groupLeaderCity: existingRegistration.groupLeaderCity,
      groupLeaderState: existingRegistration.groupLeaderState,
      groupLeaderZip: existingRegistration.groupLeaderZip,
      housingType: existingRegistration.housingType,
      specialRequests: existingRegistration.specialRequests,
      totalParticipants: existingRegistration.totalParticipants,
      youthCount: existingRegistration.youthCount,
      chaperoneCount: existingRegistration.chaperoneCount,
      priestCount: existingRegistration.priestCount,
    }

    // Update group registration
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
        totalParticipants,
        youthCount: youthCount || 0,
        chaperoneCount: chaperoneCount || 0,
        priestCount: priestCount || 0,
        updatedAt: new Date(),
      },
    })

    // If the total amount changed, update payment balance
    if (oldTotal !== newTotal && existingRegistration.paymentBalance) {
      const currentAmountPaid = Number(existingRegistration.paymentBalance.amountPaid)
      const newAmountRemaining = newTotal - currentAmountPaid

      // Determine new payment status
      let newPaymentStatus: 'unpaid' | 'partial' | 'paid_full' | 'overpaid' = 'unpaid'
      if (newAmountRemaining === 0) {
        newPaymentStatus = 'paid_full'
      } else if (newAmountRemaining < 0) {
        newPaymentStatus = 'overpaid'
      } else if (currentAmountPaid > 0) {
        newPaymentStatus = 'partial'
      }

      await prisma.paymentBalance.update({
        where: {
          registrationId,
        },
        data: {
          totalAmountDue: newTotal,
          amountRemaining: newAmountRemaining,
          paymentStatus: newPaymentStatus,
          updatedAt: new Date(),
        },
      })
    }

    // Send email notification to group leader
    if (groupLeaderEmail && existingRegistration.event) {
      try {
        // Build list of changes
        const changes: string[] = []

        if (oldValues.groupName !== groupName) {
          changes.push(`Group Name: ${oldValues.groupName} → ${groupName}`)
        }
        if (oldValues.parishName !== parishName) {
          changes.push(`Parish Name: ${oldValues.parishName} → ${parishName}`)
        }
        if (oldValues.dioceseName !== dioceseName) {
          changes.push(`Diocese: ${oldValues.dioceseName || 'None'} → ${dioceseName || 'None'}`)
        }
        if (oldValues.groupLeaderName !== groupLeaderName) {
          changes.push(`Group Leader Name: ${oldValues.groupLeaderName} → ${groupLeaderName}`)
        }
        if (oldValues.groupLeaderEmail !== groupLeaderEmail) {
          changes.push(`Group Leader Email: ${oldValues.groupLeaderEmail} → ${groupLeaderEmail}`)
        }
        if (oldValues.groupLeaderPhone !== groupLeaderPhone) {
          changes.push(`Group Leader Phone: ${oldValues.groupLeaderPhone} → ${groupLeaderPhone}`)
        }
        if (oldValues.housingType !== housingType) {
          changes.push(`Housing Type: ${oldValues.housingType} → ${housingType}`)
        }
        if (oldValues.totalParticipants !== totalParticipants) {
          changes.push(`Total Participants: ${oldValues.totalParticipants} → ${totalParticipants}`)
        }
        if (oldTotal !== newTotal) {
          changes.push(`Total Amount Due: $${oldTotal.toFixed(2)} → $${newTotal.toFixed(2)}`)
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
                <p>Hello ${groupLeaderName},</p>

                <p>Your group registration for <strong>${existingRegistration.event.name}</strong> has been updated by event administrators.</p>

                <div class="info-box">
                  <h3 style="margin-top: 0; color: #1E3A5F;">Updated Registration Details</h3>
                  <p style="margin: 5px 0;"><strong>Group Name:</strong> ${groupName}</p>
                  <p style="margin: 5px 0;"><strong>Parish:</strong> ${parishName}</p>
                  ${dioceseName ? `<p style="margin: 5px 0;"><strong>Diocese:</strong> ${dioceseName}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Total Participants:</strong> ${totalParticipants}</p>
                  <p style="margin: 5px 0;"><strong>Housing Type:</strong> ${housingType.replace('_', ' ')}</p>
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

                ${oldTotal !== newTotal ? `
                  <div class="info-box" style="background-color: ${newTotal > oldTotal ? '#FEE2E2' : '#D1FAE5'};">
                    <h3 style="margin-top: 0; color: #1E3A5F;">Payment Update</h3>
                    <p style="margin: 0;">
                      ${newTotal > oldTotal
                        ? `Your total amount due has increased from $${oldTotal.toFixed(2)} to $${newTotal.toFixed(2)} (additional $${(newTotal - oldTotal).toFixed(2)}).`
                        : `Your total amount due has decreased from $${oldTotal.toFixed(2)} to $${newTotal.toFixed(2)} (credit of $${(oldTotal - newTotal).toFixed(2)}).`
                      }
                    </p>
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
      { error: 'Failed to update group registration' },
      { status: 500 }
    )
  }
}
