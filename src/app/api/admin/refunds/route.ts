import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { canAccessOrganization } from '@/lib/auth-utils'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null

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

    if (!user || (user.role !== 'org_admin' && user.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const {
      registrationId,
      registrationType,
      refundAmount,
      refundMethod,
      refundReason,
      notes,
    } = await request.json()

    // Validate input
    if (!registrationId || !registrationType || !refundAmount || !refundMethod || !refundReason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the registration and verify ownership
    const registration =
      registrationType === 'group'
        ? await prisma.groupRegistration.findUnique({
            where: { id: registrationId },
            include: {
              event: true,
            },
          })
        : await prisma.individualRegistration.findUnique({
            where: { id: registrationId },
            include: {
              event: true,
            },
          })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Cast user to any since Prisma types differ slightly from AuthUser
    if (!canAccessOrganization(user as any, registration.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: {
        registrationId: registrationId,
      },
    })

    // Get the most recent successful payment with Stripe
    const lastPayment = await prisma.payment.findFirst({
      where: {
        registrationId: registrationId,
        registrationType: registrationType,
        paymentStatus: 'succeeded',
        stripePaymentIntentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Validate refund amount
    const amountPaid = paymentBalance?.amountPaid || 0
    if (refundAmount > amountPaid) {
      return NextResponse.json(
        { error: 'Refund amount exceeds amount paid' },
        { status: 400 }
      )
    }

    let stripeRefundId: string | null = null
    let refundStatus: 'pending' | 'completed' | 'failed' = 'pending'

    // Process Stripe refund if method is stripe
    if (refundMethod === 'stripe') {
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe is not configured' },
          { status: 500 }
        )
      }

      try {
        if (!lastPayment || !lastPayment.stripePaymentIntentId) {
          return NextResponse.json(
            { error: 'No Stripe payment found to refund' },
            { status: 400 }
          )
        }

        // Create the refund in Stripe
        const refund = await stripe.refunds.create({
          payment_intent: lastPayment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            registrationId,
            registrationType,
            refundReason,
            processedBy: user.email,
          },
        })

        stripeRefundId = refund.id
        refundStatus = 'completed'
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError)
        refundStatus = 'failed'
        return NextResponse.json(
          {
            error: 'Failed to process Stripe refund',
            details: stripeError instanceof Error ? stripeError.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    } else {
      // Manual refund - mark as pending
      refundStatus = 'pending'
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        registrationId,
        registrationType,
        refundAmount,
        refundMethod,
        refundReason,
        notes: notes || null,
        processedByUserId: user.id,
        stripeRefundId,
        status: refundStatus,
      },
    })

    // Update payment balance
    if (paymentBalance) {
      await prisma.paymentBalance.update({
        where: { id: paymentBalance.id },
        data: {
          amountPaid: {
            decrement: refundAmount,
          },
          amountRemaining: {
            increment: refundAmount,
          },
          paymentStatus: 'partial', // Will need to recalculate actual status
        },
      })
    }

    // Create audit trail entry
    await prisma.registrationEdit.create({
      data: {
        registrationId,
        registrationType,
        editedByUserId: user.id,
        editType: 'refund_processed',
        changesMade: {
          refundAmount,
          refundMethod,
          refundReason,
          refundId: refund.id,
        } as any,
        oldTotal: paymentBalance?.totalAmountDue ? Number(paymentBalance.totalAmountDue) : null,
        newTotal: paymentBalance?.totalAmountDue ? Number(paymentBalance.totalAmountDue) : null,
        difference: -refundAmount,
        adminNotes: notes || null,
      },
    })

    // Send email notification
    try {
      const recipientEmail = registrationType === 'group'
        ? (registration as any).groupLeaderEmail
        : (registration as any).email
      const recipientName = registrationType === 'group'
        ? (registration as any).groupLeaderName
        : `${(registration as any).firstName} ${(registration as any).lastName}`
      const eventName = registration.event?.name || 'the event'
      const groupName = registrationType === 'group' ? (registration as any).groupName : null

      const refundMethodText = refundMethod === 'stripe'
        ? 'via Stripe to your original payment method'
        : refundMethod === 'check'
        ? 'via check'
        : refundMethod === 'cash'
        ? 'via cash'
        : 'manually'

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: recipientEmail,
        subject: `Refund Processed - ${eventName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- ChiRho Events Logo Header -->
            <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/logo-horizontal.png" alt="ChiRho Events" style="max-width: 200px; height: auto;" />
            </div>

            <div style="padding: 30px 20px;">
              <h1 style="color: #1E3A5F; margin-top: 0;">Refund Processed</h1>

              <p>Dear ${recipientName},</p>

              <p>A refund has been processed for your registration${groupName ? ` for <strong>${groupName}</strong>` : ''} to <strong>${eventName}</strong>.</p>

              <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #9C8466; margin-top: 0;">Refund Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Refund Amount:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">$${refundAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Refund Method:</td>
                    <td style="padding: 8px 0; text-align: right;">${refundMethodText}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Date:</td>
                    <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString()}</td>
                  </tr>
                </table>
              </div>

              ${refundMethod === 'stripe' ? `
                <p style="color: #666; font-size: 14px;">
                  The refund will be processed back to your original payment method within 5-10 business days, depending on your bank.
                </p>
              ` : refundMethod === 'check' ? `
                <p style="color: #666; font-size: 14px;">
                  Your refund check will be mailed to the address on file within 7-10 business days.
                </p>
              ` : ''}

              ${refundReason ? `
                <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #9C8466; background-color: #f9f9f9;">
                  <p style="margin: 0; color: #666; font-size: 14px;"><strong>Reason:</strong> ${refundReason}</p>
                </div>
              ` : ''}

              <p>If you have any questions about this refund, please don't hesitate to contact us.</p>

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
      console.error('Failed to send refund notification email:', emailError)
      // Don't fail the request if email fails - refund was still processed
    }

    return NextResponse.json({
      success: true,
      refund,
      message:
        refundMethod === 'stripe'
          ? 'Refund processed successfully via Stripe'
          : 'Manual refund recorded. Please process manually.',
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
