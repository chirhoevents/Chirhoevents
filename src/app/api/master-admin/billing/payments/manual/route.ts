import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      organizationId,
      paymentType, // subscription, setup_fee, overage, custom
      amount,
      description,
      paymentMethod, // check, cash, card_manual, bank_transfer
      paymentDate,
      checkNumber,
      checkDate,
      deposited,
      receiptNumber,
      cardLast4,
      authorizationCode,
      referenceNumber,
      notes,
      createInvoice,
      sendReceipt,
      activateSubscription,
      periodStart,
      periodEnd,
    } = body

    if (!organizationId || !paymentType || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Organization, payment type, amount, and payment method are required' },
        { status: 400 }
      )
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        subscriptionStatus: true,
        subscriptionTier: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Map payment method to enum
    const methodMapping: Record<string, string> = {
      check: 'check',
      cash: 'cash',
      card_manual: 'card',
      bank_transfer: 'bank_transfer',
      other: 'other',
    }

    // Map payment type to enum
    const typeMapping: Record<string, string> = {
      subscription: 'deposit', // Using deposit as closest match
      setup_fee: 'deposit',
      overage: 'balance',
      custom: 'balance',
    }

    let invoice = null

    // Create invoice if requested
    if (createInvoice) {
      // Generate invoice number
      const lastInvoice = await prisma.invoice.findFirst({
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      })
      const nextInvoiceNumber = (lastInvoice?.invoiceNumber || 1000) + 1

      // Map to invoice type
      const invoiceTypeMapping: Record<string, 'setup_fee' | 'subscription' | 'reactivation_fee' | 'custom'> = {
        subscription: 'subscription',
        setup_fee: 'setup_fee',
        overage: 'custom',
        custom: 'custom',
      }

      invoice = await prisma.invoice.create({
        data: {
          organizationId,
          invoiceNumber: nextInvoiceNumber,
          invoiceType: invoiceTypeMapping[paymentType] || 'custom',
          amount: parseFloat(amount),
          description: description || `${paymentType} payment`,
          status: 'paid',
          dueDate: paymentDate ? new Date(paymentDate) : new Date(),
          paidAt: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod === 'check' ? 'check' : 'credit_card',
          periodStart: periodStart ? new Date(periodStart) : null,
          periodEnd: periodEnd ? new Date(periodEnd) : null,
          notes: notes || null,
          createdByUserId: user.id,
        },
      })
    }

    // We need to get a valid eventId and registrationId for the Payment model
    // Since this is a subscription/manual payment, we'll need to handle this differently
    // For now, let's find or create a placeholder event for subscription payments

    // First, let's check if there's any event for this org we can use
    const orgEvent = await prisma.event.findFirst({
      where: { organizationId },
      select: { id: true },
    })

    // For now, we'll just log the activity instead of creating a Payment record
    // since the Payment model requires eventId and registrationId
    // TODO: Consider updating the Payment model to make these optional for subscription payments

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId,
        userId: user.id,
        activityType: 'manual_payment_recorded',
        description: `Manual ${paymentType} payment of $${parseFloat(amount).toFixed(2)} recorded via ${paymentMethod}${checkNumber ? ` (Check #${checkNumber})` : ''}`,
        metadata: {
          amount: parseFloat(amount),
          paymentType,
          paymentMethod,
          checkNumber,
          invoiceId: invoice?.id,
          invoiceNumber: invoice?.invoiceNumber,
          notes,
        },
      },
    })

    // Create billing note
    await prisma.billingNote.create({
      data: {
        organizationId,
        invoiceId: invoice?.id || null,
        noteType: paymentMethod === 'check' ? 'check_received' : 'general',
        note: `Manual payment recorded: $${parseFloat(amount).toFixed(2)} via ${paymentMethod}${checkNumber ? ` (Check #${checkNumber})` : ''}${deposited ? ' - Deposited' : ''}${notes ? `. Notes: ${notes}` : ''}`,
        createdByUserId: user.id,
      },
    })

    // Activate subscription if requested and this is a subscription payment
    if (activateSubscription && paymentType === 'subscription') {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: 'active',
          status: 'active',
          subscriptionStartedAt: periodStart ? new Date(periodStart) : new Date(),
          subscriptionRenewsAt: periodEnd ? new Date(periodEnd) : undefined,
        },
      })

      await prisma.platformActivityLog.create({
        data: {
          organizationId,
          userId: user.id,
          activityType: 'subscription_activated',
          description: `Subscription activated for ${org.name} after manual payment`,
        },
      })
    }

    // Mark setup fee as paid if this is a setup fee payment
    if (paymentType === 'setup_fee') {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          setupFeePaid: true,
        },
      })
    }

    // TODO: Send receipt email if sendReceipt is true
    if (sendReceipt && org.contactEmail) {
      console.log(`Would send receipt to ${org.contactEmail}`)
    }

    return NextResponse.json({
      success: true,
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
          }
        : null,
      message: `Payment of $${parseFloat(amount).toFixed(2)} recorded successfully`,
    })
  } catch (error) {
    console.error('Manual payment error:', error)
    return NextResponse.json(
      { error: 'Failed to record manual payment' },
      { status: 500 }
    )
  }
}
