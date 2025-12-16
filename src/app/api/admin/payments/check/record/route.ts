import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      registrationId,
      registrationType,
      amount,
      checkNumber,
      dateReceived,
      paymentType,
      paymentStatus,
      payerName,
      depositAccount,
      depositDate,
      depositSlipNumber,
      adminNotes,
      sendEmail,
    } = body

    // Validate required fields
    if (!registrationId || !registrationType || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: registrationId, registrationType, amount' },
        { status: 400 }
      )
    }

    // Validate registration type
    if (registrationType !== 'individual' && registrationType !== 'group') {
      return NextResponse.json(
        { error: 'Invalid registrationType. Must be "individual" or "group"' },
        { status: 400 }
      )
    }

    // Validate payment status
    if (paymentStatus !== 'received' && paymentStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Invalid paymentStatus. Must be "received" or "pending"' },
        { status: 400 }
      )
    }

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      )
    }

    // Get payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId,
      },
      include: {
        individualRegistration: registrationType === 'individual' ? {
          include: {
            event: true,
            participant: true,
          },
        } : undefined,
        groupRegistration: registrationType === 'group' ? {
          include: {
            event: true,
            groupLeader: true,
          },
        } : undefined,
      },
    })

    if (!paymentBalance) {
      return NextResponse.json(
        { error: 'Payment balance not found for this registration' },
        { status: 404 }
      )
    }

    // Build notes object
    const notesObject: any = {
      checkNumber: checkNumber || null,
      paymentType: paymentType || 'partial',
      payerName: payerName || null,
      adminNotes: adminNotes || null,
    }

    // Add deposit info if payment is received
    if (paymentStatus === 'received') {
      notesObject.bankDeposit = {
        account: depositAccount || null,
        date: depositDate || null,
        slipNumber: depositSlipNumber || null,
      }
      notesObject.dateReceived = dateReceived || new Date().toISOString().split('T')[0]
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        registrationId,
        registrationType,
        amount: paymentAmount,
        currency: 'usd',
        status: paymentStatus === 'received' ? 'succeeded' : 'pending',
        paymentMethod: 'check',
        createdAt: new Date(),
        notes: JSON.stringify(notesObject),
      },
    })

    // Calculate new payment balance
    const currentAmountPaid = Number(paymentBalance.amountPaid)
    const totalAmountDue = Number(paymentBalance.totalAmountDue)

    // Only add to amountPaid if payment is received (not pending)
    const newAmountPaid = paymentStatus === 'received'
      ? currentAmountPaid + paymentAmount
      : currentAmountPaid
    const newBalanceRemaining = totalAmountDue - newAmountPaid

    // Determine new payment status
    let newPaymentStatus: 'unpaid' | 'partial' | 'paid_full' | 'overpaid' = 'unpaid'
    if (newBalanceRemaining === 0) {
      newPaymentStatus = 'paid_full'
    } else if (newBalanceRemaining < 0) {
      newPaymentStatus = 'overpaid'
    } else if (newAmountPaid > 0) {
      newPaymentStatus = 'partial'
    }

    // Update payment balance
    await prisma.paymentBalance.update({
      where: {
        registrationId,
      },
      data: {
        amountPaid: newAmountPaid,
        amountRemaining: newBalanceRemaining,
        paymentStatus: newPaymentStatus,
        lastUpdated: new Date(),
      },
    })

    // Send email notification if requested
    if (sendEmail) {
      const registration = registrationType === 'individual'
        ? paymentBalance.individualRegistration
        : paymentBalance.groupRegistration

      if (registration) {
        const event = registration.event
        const recipientEmail = registrationType === 'individual'
          ? paymentBalance.individualRegistration?.participant?.email
          : paymentBalance.groupRegistration?.groupLeader?.email

        const recipientName = registrationType === 'individual'
          ? `${paymentBalance.individualRegistration?.participant?.firstName} ${paymentBalance.individualRegistration?.participant?.lastName}`
          : paymentBalance.groupRegistration?.groupLeader?.name

        if (recipientEmail) {
          try {
            const emailSubject = paymentStatus === 'received'
              ? `Check Payment Received - ${event.name}`
              : `Check Payment Expected - ${event.name}`

            const emailBody = `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #1E3A5F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
                  .payment-box { background-color: white; border: 2px solid #1E3A5F; border-radius: 8px; padding: 20px; margin: 20px 0; }
                  .payment-detail { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                  .payment-detail:last-child { border-bottom: none; }
                  .label { font-weight: bold; color: #1E3A5F; }
                  .value { color: #333; }
                  .balance-summary { background-color: #E8F4FD; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                  .alert { background-color: #FFF4E6; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Check Payment ${paymentStatus === 'received' ? 'Received' : 'Expected'}</h1>
                  </div>
                  <div class="content">
                    <p>Hello ${recipientName},</p>

                    ${paymentStatus === 'received'
                      ? `<p>We have received and recorded your check payment for <strong>${event.name}</strong>.</p>`
                      : `<p>We have recorded an expected check payment for <strong>${event.name}</strong>. We will notify you once the check is received and processed.</p>`
                    }

                    <div class="payment-box">
                      <h3 style="margin-top: 0; color: #1E3A5F;">Payment Details</h3>
                      ${checkNumber ? `
                        <div class="payment-detail">
                          <span class="label">Check Number:</span>
                          <span class="value">${checkNumber}</span>
                        </div>
                      ` : ''}
                      <div class="payment-detail">
                        <span class="label">Amount:</span>
                        <span class="value">$${paymentAmount.toFixed(2)}</span>
                      </div>
                      <div class="payment-detail">
                        <span class="label">Payment Type:</span>
                        <span class="value">${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment</span>
                      </div>
                      ${paymentStatus === 'received' && dateReceived ? `
                        <div class="payment-detail">
                          <span class="label">Date Received:</span>
                          <span class="value">${new Date(dateReceived).toLocaleDateString()}</span>
                        </div>
                      ` : ''}
                      ${payerName ? `
                        <div class="payment-detail">
                          <span class="label">Payer Name:</span>
                          <span class="value">${payerName}</span>
                        </div>
                      ` : ''}
                    </div>

                    <div class="balance-summary">
                      <h3 style="margin-top: 0; color: #1E3A5F;">Updated Balance</h3>
                      <div class="payment-detail">
                        <span class="label">Total Amount Due:</span>
                        <span class="value">$${totalAmountDue.toFixed(2)}</span>
                      </div>
                      <div class="payment-detail">
                        <span class="label">Amount Paid:</span>
                        <span class="value">$${newAmountPaid.toFixed(2)}</span>
                      </div>
                      <div class="payment-detail">
                        <span class="label">Balance Remaining:</span>
                        <span class="value" style="font-size: 18px; font-weight: bold; color: ${newBalanceRemaining === 0 ? '#10B981' : '#1E3A5F'};">
                          $${newBalanceRemaining.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    ${newBalanceRemaining > 0 ? `
                      <div class="alert">
                        <p style="margin: 0;"><strong>Note:</strong> You still have a balance of $${newBalanceRemaining.toFixed(2)} remaining for this registration.</p>
                      </div>
                    ` : newBalanceRemaining === 0 ? `
                      <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Congratulations!</strong> Your registration is now fully paid.</p>
                      </div>
                    ` : `
                      <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Note:</strong> This payment resulted in an overpayment of $${Math.abs(newBalanceRemaining).toFixed(2)}. Please contact us to arrange a refund.</p>
                      </div>
                    `}

                    ${paymentStatus === 'pending' ? `
                      <p><strong>Next Steps:</strong> Please mail your check to the address provided in your registration confirmation. You will receive another notification once we receive and process your check.</p>
                    ` : ''}

                    <p>If you have any questions about this payment or your registration, please don't hesitate to contact us.</p>

                    <p>Thank you!</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated message from ChiRho Events.</p>
                    <p>${event.name}</p>
                  </div>
                </div>
              </body>
              </html>
            `

            await resend.emails.send({
              from: 'ChiRho Events <noreply@chirhoevents.com>',
              to: recipientEmail,
              subject: emailSubject,
              html: emailBody,
            })
          } catch (emailError) {
            console.error('Failed to send email:', emailError)
            // Don't fail the entire request if email fails
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment,
      newBalance: {
        amountPaid: newAmountPaid,
        amountRemaining: newBalanceRemaining,
        paymentStatus: newPaymentStatus,
      },
    })
  } catch (error) {
    console.error('Error recording check payment:', error)
    return NextResponse.json(
      { error: 'Failed to record check payment' },
      { status: 500 }
    )
  }
}
