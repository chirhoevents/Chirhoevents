import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paymentId = params.paymentId
    const {
      checkNumber,
      actualAmount,
      dateReceived,
      depositAccount,
      depositDate,
      depositSlipNumber,
      adminNotes,
      sendEmail,
    } = await request.json()

    // Get the payment with registration data
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Verify the payment is a check payment
    if (payment.paymentMethod !== 'check') {
      return NextResponse.json(
        { error: 'Payment is not a check payment' },
        { status: 400 }
      )
    }

    // Get the registration for email
    const registration =
      payment.registrationType === 'group'
        ? await prisma.groupRegistration.findUnique({
            where: { id: payment.registrationId },
            include: { event: true },
          })
        : await prisma.individualRegistration.findUnique({
            where: { id: payment.registrationId },
            include: { event: true },
          })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Update the payment to mark as received
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'succeeded',
        checkReceivedDate: new Date(dateReceived),
        processedAt: new Date(),
        checkNumber: checkNumber || payment.checkNumber,
        notes: adminNotes
          ? `${payment.notes ? payment.notes + '\n\n' : ''}Check received: ${adminNotes}${
              depositAccount ? `\nDeposit Account: ${depositAccount}` : ''
            }${depositDate ? `\nDeposit Date: ${depositDate}` : ''}${
              depositSlipNumber ? `\nDeposit Slip: ${depositSlipNumber}` : ''
            }`
          : payment.notes,
      },
    })

    // Update payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: { registrationId: payment.registrationId },
    })

    if (paymentBalance) {
      const newAmountPaid = Number(paymentBalance.amountPaid) + actualAmount
      const newBalanceRemaining = Number(paymentBalance.totalAmountDue) - newAmountPaid

      // Determine new payment status
      let newPaymentStatus: 'unpaid' | 'partial' | 'paid_full' | 'overpaid' = 'unpaid'
      if (newBalanceRemaining === 0) {
        newPaymentStatus = 'paid_full'
      } else if (newBalanceRemaining < 0) {
        newPaymentStatus = 'overpaid'
      } else if (newAmountPaid > 0) {
        newPaymentStatus = 'partial'
      }

      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          amountPaid: newAmountPaid,
          amountRemaining: newBalanceRemaining,
          paymentStatus: newPaymentStatus,
          lastPaymentDate: new Date(),
        },
      })
    }

    // Send email notification if requested
    if (sendEmail) {
      try {
        const recipientEmail =
          payment.registrationType === 'group'
            ? (registration as any).groupLeaderEmail
            : (registration as any).email
        const recipientName =
          payment.registrationType === 'group'
            ? (registration as any).groupLeaderName
            : `${(registration as any).firstName} ${(registration as any).lastName}`
        const eventName = registration.event?.name || 'the event'
        const groupName =
          payment.registrationType === 'group' ? (registration as any).groupName : null

        // Get updated payment balance for email
        const updatedBalance = await prisma.paymentBalance.findUnique({
          where: { registrationId: payment.registrationId },
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: recipientEmail,
          subject: `Payment Received - ${eventName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <!-- ChiRho Events Logo Header -->
              <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
                <img src="${
                  process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
                }/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
              </div>

              <div style="padding: 30px 20px;">
                <h1 style="color: #1E3A5F; margin-top: 0;">Payment Received!</h1>

                <p>Dear ${recipientName},</p>

                <p>We've received your check payment for ${groupName ? `<strong>${groupName}</strong>` : 'your registration'} to <strong>${eventName}</strong>.</p>

                <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #9C8466; margin-top: 0;">Payment Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Amount Received:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: right;">$${actualAmount.toFixed(
                        2
                      )}</td>
                    </tr>
                    ${
                      checkNumber
                        ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Check Number:</td>
                      <td style="padding: 8px 0; text-align: right;">${checkNumber}</td>
                    </tr>
                    `
                        : ''
                    }
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Date Received:</td>
                      <td style="padding: 8px 0; text-align: right;">${new Date(
                        dateReceived
                      ).toLocaleDateString()}</td>
                    </tr>
                  </table>
                </div>

                ${
                  updatedBalance
                    ? `
                <div style="background-color: #E8F4FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #1E3A5F; margin-top: 0;">Updated Balance</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Total Amount Due:</td>
                      <td style="padding: 8px 0; text-align: right;">$${Number(
                        updatedBalance.totalAmountDue
                      ).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Total Paid:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #16a34a; text-align: right;">$${Number(
                        updatedBalance.amountPaid
                      ).toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #1E3A5F;">
                      <td style="padding: 8px 0; font-weight: bold; color: #1E3A5F;">Balance Remaining:</td>
                      <td style="padding: 8px 0; font-weight: bold; font-size: 18px; color: #1E3A5F; text-align: right;">$${Number(
                        updatedBalance.amountRemaining
                      ).toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
                `
                    : ''
                }

                <p>Thank you for your payment!</p>

                ${
                  updatedBalance && Number(updatedBalance.amountRemaining) > 0
                    ? `
                <p style="color: #666; font-size: 14px;">
                  You still have a balance of $${Number(updatedBalance.amountRemaining).toFixed(
                    2
                  )}.
                  You can make additional payments online or by check.
                </p>
                `
                    : updatedBalance && Number(updatedBalance.amountRemaining) === 0
                    ? `
                <p style="color: #16a34a; font-weight: bold;">
                  ✓ Your registration is now fully paid!
                </p>
                `
                    : ''
                }

                <p style="margin-top: 30px;">
                  Best regards,<br>
                  <strong>ChiRho Events Team</strong>
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding: 20px; background-color: #f5f5f5; color: #666; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} ChiRho Events. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">
                  Need help? Contact us at
                  <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>
                </p>
              </div>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError)
        // Don't fail the request if email fails - payment was still recorded
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: 'Check marked as received successfully',
    })
  } catch (error) {
    console.error('Error marking check as received:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
