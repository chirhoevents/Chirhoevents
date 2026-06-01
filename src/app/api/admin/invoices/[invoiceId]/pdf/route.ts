import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { generateInvoicePDF } from '@/lib/pdf/generate-invoice-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const tierLabels: Record<string, string> = {
  chapel: 'Chapel',
  parish: 'Parish',
  cathedral: 'Cathedral',
  shrine: 'Shrine',
  basilica: 'Basilica',
  starter: 'Chapel',
  small_diocese: 'Parish',
  growing: 'Cathedral',
  conference: 'Shrine',
  enterprise: 'Basilica',
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

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      include: { organization: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getEffectiveOrgId(user as any)

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

    if (user.role !== 'master_admin') {
      if (organizationId !== invoice.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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

    const pdfBuffer = await generateInvoicePDF(invoiceData)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[Invoice PDF] generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}
