import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Generate a secure random payment token
function generatePaymentToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Decode JWT payload to extract user ID when cookies aren't available
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

// Helper to get clerk user ID from auth or JWT token
async function getClerkUserId(request: NextRequest): Promise<string | null> {
  // Try to get userId from Clerk's auth (works when cookies are established)
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

  // Fallback: try to get userId from Authorization header (JWT token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
      return payload.sub
    }
  }

  return null
}

// List all invoices
export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserId(request)

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    // Add payment links to invoices
    const invoicesWithLinks = invoices.map(invoice => ({
      ...invoice,
      paymentLink: invoice.paymentToken ? `${appUrl}/pay/invoice/${invoice.paymentToken}` : null,
    }))

    return NextResponse.json({ invoices: invoicesWithLinks })
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
    const clerkUserId = await getClerkUserId(request)

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
      periodStart,
      periodEnd,
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

    // Generate payment token for online payment link
    const paymentToken = generatePaymentToken()

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
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        paymentToken: paymentToken,
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        status: invoice.status,
        paymentLink: `${appUrl}/pay/invoice/${paymentToken}`,
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
