import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// List all invoices
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (orgId) {
      where.organizationId = orgId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('List invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// Create a new invoice
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      organizationId,
      invoiceType,
      amount,
      description,
      dueDate,
      lineItems,
    } = body

    if (!organizationId || !invoiceType || !amount) {
      return NextResponse.json(
        { error: 'Organization, invoice type, and amount are required' },
        { status: 400 }
      )
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    })
    const nextInvoiceNumber = (lastInvoice?.invoiceNumber || 1000) + 1

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber: nextInvoiceNumber,
        invoiceType: invoiceType as 'setup_fee' | 'subscription' | 'reactivation_fee' | 'custom',
        amount: parseFloat(amount),
        description: description || null,
        lineItems: lineItems || null,
        status: 'pending',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdByUserId: user.id,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId,
        userId: user.id,
        activityType: 'invoice_created',
        description: `Created invoice #${invoice.invoiceNumber} for $${amount} (${invoiceType})`,
      },
    })

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        status: invoice.status,
      },
    })
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
