import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  small_diocese: 'Small Diocese',
  growing: 'Growing',
  conference: 'Conference',
  enterprise: 'Enterprise',
  test: 'Test',
}

const invoiceTypeLabels: Record<string, string> = {
  setup_fee: 'Setup Fee',
  subscription: 'Subscription',
  overage: 'Overage Fee',
  custom: 'Custom',
  reactivation: 'Reactivation Fee',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access (org_admin or master_admin)
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true, organizationId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactName: true,
            contactPhone: true,
            address: true,
            subscriptionTier: true,
            legalEntityName: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check access: master_admin can see all, org_admin can only see their org's invoices
    if (user.role !== 'master_admin') {
      if (user.organizationId !== invoice.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Prepare invoice data for PDF
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoiceTypeLabels[invoice.invoiceType] || invoice.invoiceType,
      amount: Number(invoice.amount),
      description: invoice.description || '',
      lineItems: invoice.lineItems as Array<{ description: string; amount: number }> | null,
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString() || null,
      createdAt: invoice.createdAt.toISOString(),
      periodStart: invoice.periodStart?.toISOString() || null,
      periodEnd: invoice.periodEnd?.toISOString() || null,
      organization: {
        name: invoice.organization.name,
        legalName: invoice.organization.legalEntityName || invoice.organization.name,
        contactName: invoice.organization.contactName || '',
        contactEmail: invoice.organization.contactEmail,
        contactPhone: invoice.organization.contactPhone || '',
        address: invoice.organization.address as { street?: string; city?: string; state?: string; zip?: string } | null,
        tier: tierLabels[invoice.organization.subscriptionTier] || invoice.organization.subscriptionTier,
      },
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, { invoice: invoiceData })
    )

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Invoice PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}
