import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Generate a secure random payment token
function generatePaymentToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate or get payment link for an invoice
export async function POST(
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
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        paymentToken: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Invoice is cancelled' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    // If token already exists, return it
    if (invoice.paymentToken) {
      return NextResponse.json({
        success: true,
        paymentLink: `${appUrl}/pay/invoice/${invoice.paymentToken}`,
        isNew: false,
      })
    }

    // Generate new payment token
    const paymentToken = generatePaymentToken()

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paymentToken },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        userId: user.id,
        activityType: 'payment_link_generated',
        description: `Payment link generated for invoice #${invoice.invoiceNumber}`,
        metadata: { invoiceId },
      },
    })

    return NextResponse.json({
      success: true,
      paymentLink: `${appUrl}/pay/invoice/${paymentToken}`,
      isNew: true,
    })
  } catch (error) {
    console.error('Generate payment link error:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment link' },
      { status: 500 }
    )
  }
}

// Get payment link for an invoice
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
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        paymentToken: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    if (!invoice.paymentToken) {
      return NextResponse.json({
        success: true,
        paymentLink: null,
        message: 'No payment link exists. Use POST to generate one.',
      })
    }

    return NextResponse.json({
      success: true,
      paymentLink: `${appUrl}/pay/invoice/${invoice.paymentToken}`,
    })
  } catch (error) {
    console.error('Get payment link error:', error)
    return NextResponse.json(
      { error: 'Failed to get payment link' },
      { status: 500 }
    )
  }
}
