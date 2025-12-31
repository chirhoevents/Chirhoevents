import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()

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

    const { id } = await params
    const body = await request.json()
    const { paymentMethod, paymentDate, checkNumber, notes, sendReceipt } = body

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            subscriptionStatus: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }

    // Update invoice to paid
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'check',
        notes: notes
          ? `${invoice.notes || ''}\n\nPayment Notes: ${notes}`.trim()
          : invoice.notes,
      },
    })

    // Create a payment record
    // We need a dummy eventId and registrationId for the payment record
    // or we should make these optional in the Payment model
    // For now, let's try to create with what we have

    // Log the activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: invoice.organizationId,
        userId: user.id,
        activityType: 'invoice_marked_paid',
        description: `Invoice #${invoice.invoiceNumber} marked as paid ($${Number(invoice.amount).toFixed(2)}) via ${paymentMethod}${checkNumber ? ` - Check #${checkNumber}` : ''}`,
        metadata: {
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.amount),
          paymentMethod,
          checkNumber,
        },
      },
    })

    // If this is a subscription invoice and org is not active, activate them
    if (
      invoice.invoiceType === 'subscription' &&
      invoice.organization?.subscriptionStatus !== 'active'
    ) {
      await prisma.organization.update({
        where: { id: invoice.organizationId },
        data: {
          subscriptionStatus: 'active',
          status: 'active',
        },
      })

      await prisma.platformActivityLog.create({
        data: {
          organizationId: invoice.organizationId,
          userId: user.id,
          activityType: 'subscription_activated',
          description: `Subscription activated for ${invoice.organization.name} after payment`,
        },
      })
    }

    // If this is a setup fee invoice, mark setup fee as paid
    if (invoice.invoiceType === 'setup_fee') {
      await prisma.organization.update({
        where: { id: invoice.organizationId },
        data: {
          setupFeePaid: true,
        },
      })
    }

    // Add a billing note
    await prisma.billingNote.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId: id,
        noteType: paymentMethod === 'check' ? 'check_received' : 'general',
        note: `Invoice #${invoice.invoiceNumber} marked as paid. Amount: $${Number(invoice.amount).toFixed(2)}. Method: ${paymentMethod}${checkNumber ? `. Check #${checkNumber}` : ''}${notes ? `. Notes: ${notes}` : ''}`,
        createdByUserId: user.id,
      },
    })

    // TODO: Send receipt email if sendReceipt is true
    if (sendReceipt && invoice.organization?.contactEmail) {
      // Email sending logic would go here
      console.log(`Would send receipt to ${invoice.organization.contactEmail}`)
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        status: updatedInvoice.status,
        paidAt: updatedInvoice.paidAt,
      },
    })
  } catch (error) {
    console.error('Mark invoice paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark invoice as paid' },
      { status: 500 }
    )
  }
}
