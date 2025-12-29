import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { generateVirtualTerminalReceipt } from '@/lib/email-templates'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check permission
    if (!hasPermission(user.role, 'payments.process')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      registrationType,
      registrationId,
      amount,
      notes,
      paymentMethod,
      stripePaymentMethodId
    } = body

    // Validate amount
    const amountCents = Math.round(amount * 100)
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Get organization with Stripe account
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        stripeAccountId: true,
        stripeChargesEnabled: true
      }
    })

    if (!org?.stripeAccountId) {
      return NextResponse.json({
        error: 'Stripe not connected. Please connect Stripe in Settings.'
      }, { status: 400 })
    }

    // Get registration
    let registration: {
      id: string
      eventId: string
      recipientEmail: string
      recipientName: string
      totalAmount: number
      amountPaid: number
      eventName: string
    } | null = null

    if (registrationType === 'group') {
      const groupReg = await prisma.groupRegistration.findFirst({
        where: {
          id: registrationId,
          organizationId: user.organizationId
        },
        include: {
          event: { select: { id: true, name: true } }
        }
      })

      if (!groupReg) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      // Get payment balance
      const balance = await prisma.paymentBalance.findFirst({
        where: {
          registrationId: groupReg.id,
          registrationType: 'group'
        }
      })

      registration = {
        id: groupReg.id,
        eventId: groupReg.eventId,
        recipientEmail: groupReg.groupLeaderEmail,
        recipientName: groupReg.groupLeaderName,
        totalAmount: Number(balance?.totalAmountDue || 0),
        amountPaid: Number(balance?.amountPaid || 0),
        eventName: groupReg.event.name
      }

    } else {
      const individualReg = await prisma.individualRegistration.findFirst({
        where: {
          id: registrationId,
          organizationId: user.organizationId
        },
        include: {
          event: { select: { id: true, name: true } }
        }
      })

      if (!individualReg) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      // Get payment balance
      const balance = await prisma.paymentBalance.findFirst({
        where: {
          registrationId: individualReg.id,
          registrationType: 'individual'
        }
      })

      registration = {
        id: individualReg.id,
        eventId: individualReg.eventId,
        recipientEmail: individualReg.email,
        recipientName: `${individualReg.firstName} ${individualReg.lastName}`,
        totalAmount: Number(balance?.totalAmountDue || 0),
        amountPaid: Number(balance?.amountPaid || 0),
        eventName: individualReg.event.name
      }
    }

    // Validate balance
    const currentBalance = registration.totalAmount - registration.amountPaid
    if (amount > currentBalance) {
      return NextResponse.json({
        error: `Amount exceeds balance of $${currentBalance.toFixed(2)}`
      }, { status: 400 })
    }

    // Process payment based on method
    interface PaymentData {
      organizationId: string
      eventId: string
      registrationId: string
      registrationType: 'group' | 'individual'
      amount: number
      paymentType: 'balance'
      paymentMethod: 'card' | 'check' | 'cash'
      paymentStatus: 'succeeded' | 'pending'
      notes: string | null
      processedByUserId: string
      processedVia: 'virtual_terminal'
      processedAt: Date
      stripePaymentIntentId?: string
      stripePaymentMethodId?: string
      cardBrand?: string
      cardLast4?: string
    }

    const paymentData: PaymentData = {
      organizationId: user.organizationId,
      eventId: registration.eventId,
      registrationId: registration.id,
      registrationType: registrationType as 'group' | 'individual',
      amount,
      paymentType: 'balance',
      paymentMethod: paymentMethod === 'new_card' || paymentMethod === 'saved_card' ? 'card' : paymentMethod,
      paymentStatus: 'succeeded',
      notes: notes || null,
      processedByUserId: user.id,
      processedVia: 'virtual_terminal',
      processedAt: new Date()
    }

    if (paymentMethod === 'new_card' || paymentMethod === 'saved_card') {
      if (!stripePaymentMethodId) {
        return NextResponse.json({ error: 'Payment method required' }, { status: 400 })
      }

      try {
        // For Stripe Connect, payment methods created with Elements are owned by the platform
        // Use destination charges model - charge on platform, transfer to connected account

        // Get card details from the payment method for receipts
        const originalPm = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
        const cardBrand = originalPm.card?.brand || ''
        const cardLast4 = originalPm.card?.last4 || ''

        // Create PaymentIntent on platform with transfer to connected account
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          payment_method: stripePaymentMethodId,
          confirm: true,
          description: `${org.name} - ${registration.eventName} - ${registration.recipientName}`,
          metadata: {
            organizationId: user.organizationId,
            eventId: registration.eventId,
            registrationType,
            registrationId: registration.id,
            processedBy: user.id,
            processedVia: 'virtual_terminal'
          },
          // Use destination charges - funds go to connected account
          transfer_data: {
            destination: org.stripeAccountId
          },
          // Enable automatic payment methods for better compatibility
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          }
        })

        if (paymentIntent.status !== 'succeeded') {
          return NextResponse.json({
            error: `Payment failed with status: ${paymentIntent.status}`
          }, { status: 400 })
        }

        paymentData.stripePaymentIntentId = paymentIntent.id
        paymentData.stripePaymentMethodId = stripePaymentMethodId
        paymentData.cardBrand = cardBrand
        paymentData.cardLast4 = cardLast4

      } catch (stripeError) {
        console.error('Stripe error:', stripeError)
        const errorMessage = stripeError instanceof Error ? stripeError.message : 'Card was declined'
        return NextResponse.json({ error: errorMessage }, { status: 400 })
      }
    }

    // Save payment to database
    const payment = await prisma.payment.create({
      data: paymentData
    })

    // Update payment balance - RECALCULATE from all payments for idempotency
    const allSucceededPayments = await prisma.payment.findMany({
      where: {
        registrationId: registration.id,
        paymentStatus: 'succeeded',
      },
      select: { amount: true },
    })

    const newAmountPaid = allSucceededPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    )
    const newBalance = registration.totalAmount - newAmountPaid
    const paymentStatus = newBalance <= 0 ? 'paid_full' : 'partial'

    await prisma.paymentBalance.update({
      where: {
        registrationId: registration.id
      },
      data: {
        amountPaid: newAmountPaid,
        amountRemaining: newBalance,
        lastPaymentDate: new Date(),
        paymentStatus
      }
    })

    // Update registration status if paid in full
    if (newBalance <= 0) {
      if (registrationType === 'group') {
        const groupReg = await prisma.groupRegistration.findUnique({
          where: { id: registration.id },
          select: { registrationStatus: true }
        })

        // If pending_payment, update to pending_forms or complete
        if (groupReg?.registrationStatus === 'pending_payment') {
          await prisma.groupRegistration.update({
            where: { id: registration.id },
            data: { registrationStatus: 'pending_forms' }
          })
        }
      } else {
        const individualReg = await prisma.individualRegistration.findUnique({
          where: { id: registration.id },
          select: { registrationStatus: true }
        })

        if (individualReg?.registrationStatus === 'pending_payment') {
          await prisma.individualRegistration.update({
            where: { id: registration.id },
            data: { registrationStatus: 'pending_forms' }
          })
        }
      }
    }

    // Create audit trail entry
    await prisma.registrationEdit.create({
      data: {
        registrationId: registration.id,
        registrationType: registrationType as 'group' | 'individual',
        editedByUserId: user.id,
        editType: 'payment_processed',
        changesMade: {
          paymentAmount: amount,
          paymentMethod: paymentData.paymentMethod,
          processedVia: 'virtual_terminal',
          notes
        },
        adminNotes: notes || undefined,
        emailSent: true
      }
    })

    // Send receipt email
    try {
      const emailHtml = generateVirtualTerminalReceipt({
        recipientName: registration.recipientName,
        eventName: registration.eventName,
        amount,
        paymentMethod: paymentData.paymentMethod,
        cardLast4: paymentData.cardLast4,
        cardBrand: paymentData.cardBrand,
        processedBy: `${user.firstName} ${user.lastName}`,
        notes: notes || undefined,
        newBalance,
        organizationName: org.name
      })

      await resend.emails.send({
        from: `${org.name} <payments@chirhoevents.com>`,
        to: registration.recipientEmail,
        subject: `Payment Received - ${registration.eventName}`,
        html: emailHtml
      })
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError)
      // Don't fail the payment if email fails
    }

    // Return success
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount,
        paymentMethod: paymentData.paymentMethod,
        cardLast4: paymentData.cardLast4 || undefined,
        recipientEmail: registration.recipientEmail,
        recipientName: registration.recipientName,
        eventName: registration.eventName,
        newBalance
      }
    })

  } catch (error) {
    console.error('Virtual terminal payment error:', error)
    return NextResponse.json({
      error: 'Payment processing failed'
    }, { status: 500 })
  }
}
