import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const body = await request.json()

    const {
      registrationId,
      registrationType,
      amount,
      paymentMethod,
      paymentDate,
      checkNumber,
      checkDate,
      cardLast4,
      cardholderName,
      authorizationCode,
      paymentMethodDetails,
      transactionReference,
      notes,
      sendEmail,
    } = body

    // Validate required fields
    if (!registrationId || !registrationType || !amount || !paymentMethod || !paymentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: registrationId, registrationType, amount, paymentMethod, paymentDate' },
        { status: 400 }
      )
    }

    // Validate amount
    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate date not in future
    const providedDate = new Date(paymentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (providedDate > today) {
      return NextResponse.json(
        { error: 'Payment date cannot be in the future' },
        { status: 400 }
      )
    }

    // Get registration details for email (outside transaction)
    let registration: any = null
    let recipientEmail = ''
    let recipientName = ''

    if (registrationType === 'individual') {
      registration = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        include: { event: true },
      })
      recipientEmail = registration?.email || ''
      recipientName = `${registration?.firstName} ${registration?.lastName}`
    } else {
      registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        include: { event: true },
      })
      recipientEmail = registration?.groupLeaderEmail || ''
      recipientName = registration?.groupName || ''
    }

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Use a transaction to ensure atomicity and prevent race conditions
    const result = await prisma.$transaction(async (tx: any) => {
      // Get fresh payment balance inside transaction
      const paymentBalance = await tx.paymentBalance.findUnique({
        where: { registrationId },
      })

      if (!paymentBalance) {
        throw new Error('Payment balance not found')
      }

      // Verify the registration belongs to the user's organization
      // Cast user to any since Prisma types differ slightly from AuthUser
      if (!canAccessOrganization(user as any, paymentBalance.organizationId)) {
        throw new Error('Forbidden')
      }

      // Check for duplicate payment inside transaction (same amount within last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30000)
      const duplicatePayment = await tx.payment.findFirst({
        where: {
          registrationId,
          registrationType: registrationType as 'individual' | 'group',
          amount: paymentAmount,
          paymentMethod: paymentMethod as 'card' | 'check' | 'cash' | 'bank_transfer' | 'other',
          createdAt: { gte: thirtySecondsAgo },
        },
      })

      if (duplicatePayment) {
        console.warn('Duplicate payment detected in transaction:', {
          registrationId,
          amount: paymentAmount,
          existingPaymentId: duplicatePayment.id,
        })
        throw new Error('Duplicate payment')
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          organizationId: paymentBalance.organizationId,
          eventId: paymentBalance.eventId,
          registrationId,
          registrationType: registrationType as 'individual' | 'group',
          amount: paymentAmount,
          paymentType: 'balance',
          paymentMethod: paymentMethod as 'card' | 'check' | 'cash' | 'bank_transfer' | 'other',
          paymentStatus: 'succeeded',
          checkNumber: checkNumber || null,
          checkDate: checkDate ? new Date(checkDate) : null,
          checkReceivedDate: paymentMethod === 'check' ? new Date(paymentDate) : null,
          cardLast4: cardLast4 || null,
          cardholderName: cardholderName || null,
          authorizationCode: authorizationCode || null,
          paymentMethodDetails: paymentMethodDetails || null,
          transactionReference: transactionReference || null,
          notes: notes || null,
          processedAt: new Date(paymentDate),
          processedByUserId: user.id,
        },
      })

      // Recalculate balance from ALL succeeded payments for this registration type
      const allPayments = await tx.payment.findMany({
        where: {
          registrationId,
          registrationType: registrationType as 'individual' | 'group',
          paymentStatus: 'succeeded',
        },
        select: { id: true, amount: true, createdAt: true },
      })

      // Sum up all succeeded payments
      const newAmountPaid = allPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      const totalDue = Number(paymentBalance.totalAmountDue)
      const newAmountRemaining = totalDue - newAmountPaid

      // Determine new payment status
      let newPaymentStatus: 'unpaid' | 'partial' | 'paid_full' | 'overpaid' = 'unpaid'
      if (newAmountRemaining === 0) {
        newPaymentStatus = 'paid_full'
      } else if (newAmountRemaining < 0) {
        newPaymentStatus = 'overpaid'
      } else if (newAmountPaid > 0) {
        newPaymentStatus = 'partial'
      }

      // Detailed logging for debugging
      console.log('=== PAYMENT RECORDING DEBUG ===')
      console.log('Registration ID:', registrationId)
      console.log('Registration Type:', registrationType)
      console.log('New payment amount:', paymentAmount)
      console.log('All payments found:', allPayments.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        createdAt: p.createdAt,
      })))
      console.log('Total from payments:', newAmountPaid)
      console.log('Total due:', totalDue)
      console.log('Remaining:', newAmountRemaining)
      console.log('================================')

      // Update payment balance with recalculated amount
      await tx.paymentBalance.update({
        where: { registrationId },
        data: {
          amountPaid: newAmountPaid,
          amountRemaining: newAmountRemaining,
          paymentStatus: newPaymentStatus,
          lastPaymentDate: new Date(),
        },
      })

      return {
        payment,
        newAmountPaid,
        newAmountRemaining,
        newPaymentStatus,
        totalAmountDue: Number(paymentBalance.totalAmountDue),
        // Debug info
        _debug: {
          paymentsCountAfterCreate: allPayments.length,
          paymentIds: allPayments.map((p: any) => p.id),
          paymentAmounts: allPayments.map((p: any) => Number(p.amount)),
          sumCalculation: `${allPayments.map((p: any) => Number(p.amount)).join(' + ')} = ${newAmountPaid}`,
        },
      }
    })

    // Send email notification if requested (outside transaction)
    if (sendEmail && recipientEmail && registration.event) {
      try {
        const paymentMethodLabel = paymentMethod === 'card'
          ? 'Credit Card'
          : paymentMethod === 'check'
          ? 'Check'
          : paymentMethod === 'cash'
          ? 'Cash'
          : paymentMethod === 'bank_transfer'
          ? 'Wire Transfer'
          : paymentMethodDetails || 'Other'

        let referenceInfo = ''
        if (paymentMethod === 'check' && checkNumber) {
          referenceInfo = `Check #${checkNumber}`
        } else if (paymentMethod === 'card' && cardLast4) {
          referenceInfo = `Card ending in ${cardLast4}`
        } else if (transactionReference) {
          referenceInfo = transactionReference
        }

        const emailSubject = result.newPaymentStatus === 'paid_full'
          ? `Payment Received - PAID IN FULL! - ${registration.event.name}`
          : `Payment Received - ${registration.event.name}`

        const emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #1E3A5F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
              .payment-box { background-color: white; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 4px; }
              .balance-box { background-color: ${result.newPaymentStatus === 'paid_full' ? '#D1FAE5' : '#FEF3C7'}; border-left: 4px solid ${result.newPaymentStatus === 'paid_full' ? '#10B981' : '#F59E0B'}; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .paid-full { color: #10B981; font-weight: bold; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Payment Received!</h1>
              </div>
              <div class="content">
                <p>Hello ${registrationType === 'group' ? registration.groupLeaderName : recipientName},</p>

                <p>We have received your payment for <strong>${registration.event.name}</strong>.</p>

                <div class="payment-box">
                  <h3 style="margin-top: 0; color: #1E3A5F;">Payment Details</h3>
                  <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${paymentAmount.toFixed(2)}</p>
                  <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethodLabel}</p>
                  ${referenceInfo ? `<p style="margin: 5px 0;"><strong>Reference:</strong> ${referenceInfo}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(paymentDate).toLocaleDateString()}</p>
                </div>

                <div class="balance-box">
                  <h3 style="margin-top: 0; color: ${result.newPaymentStatus === 'paid_full' ? '#10B981' : '#F59E0B'};">Updated Balance</h3>
                  <p style="margin: 5px 0;"><strong>Total Amount Due:</strong> $${result.totalAmountDue.toFixed(2)}</p>
                  <p style="margin: 5px 0;"><strong>Total Paid:</strong> $${result.newAmountPaid.toFixed(2)}</p>
                  <p style="margin: 5px 0;"><strong>Balance Remaining:</strong> $${result.newAmountRemaining.toFixed(2)}</p>
                  ${result.newPaymentStatus === 'paid_full' ? `
                    <p class="paid-full" style="margin-top: 15px;">✅ PAID IN FULL!</p>
                    <p style="margin: 5px 0; color: #10B981;">Your registration is now fully paid. Thank you!</p>
                  ` : ''}
                </div>

                ${notes ? `
                  <div style="background-color: #E8F4FD; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1E3A5F;">Notes</h3>
                    <p style="margin: 0;">${notes}</p>
                  </div>
                ` : ''}

                <p>If you have any questions about this payment, please contact the event organizers.</p>

                <p>Thank you!</p>
              </div>
              <div class="footer">
                <p>This is an automated message from ChiRho Events.</p>
                <p>${registration.event.name}</p>
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

    return NextResponse.json({
      success: true,
      payment: {
        id: result.payment.id,
        amount: Number(result.payment.amount),
        paymentMethod: result.payment.paymentMethod,
        paymentStatus: result.payment.paymentStatus,
      },
      updatedBalance: {
        amountPaid: result.newAmountPaid,
        amountRemaining: result.newAmountRemaining,
        paymentStatus: result.newPaymentStatus,
      },
    })
  } catch (error) {
    console.error('Error recording payment:', error)

    // Handle specific error messages
    if (error instanceof Error) {
      if (error.message === 'Duplicate payment') {
        return NextResponse.json(
          { error: 'Duplicate payment detected. This payment was already recorded.' },
          { status: 409 }
        )
      }
      if (error.message === 'Payment balance not found') {
        return NextResponse.json(
          { error: 'Payment balance not found for this registration' },
          { status: 404 }
        )
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
