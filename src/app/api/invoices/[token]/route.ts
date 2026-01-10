import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint - no auth required
// Fetches invoice by payment token for public payment page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        paymentToken: token,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            legalEntityName: true,
            contactEmail: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Return invoice data for public display
    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        status: invoice.status,
        invoiceType: invoice.invoiceType,
        description: invoice.description,
        dueDate: invoice.dueDate.toISOString(),
        paidAt: invoice.paidAt?.toISOString() || null,
        periodStart: invoice.periodStart?.toISOString() || null,
        periodEnd: invoice.periodEnd?.toISOString() || null,
        lineItems: invoice.lineItems as Array<{ description: string; amount: number }> | null,
        organization: {
          name: invoice.organization.name,
          legalName: invoice.organization.legalEntityName || invoice.organization.name,
          contactEmail: invoice.organization.contactEmail,
        },
      },
    })
  } catch (error) {
    console.error('Fetch invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
