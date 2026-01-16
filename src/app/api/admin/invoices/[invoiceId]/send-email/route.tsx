import { NextRequest, NextResponse } from 'next/server'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

// Must use Node.js runtime for @react-pdf/renderer (not Edge)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY!)

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  parish: 'Parish',
  cathedral: 'Cathedral',
  shrine: 'Shrine',
  basilica: 'Basilica',
  // Legacy tier names for backward compatibility
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is master_admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { invoiceId } = await params

    // Parse optional body for custom email
    let customEmail: string | null = null
    try {
      const body = await request.json()
      customEmail = body.email || null
    } catch {
      // No body or invalid JSON - use default org email
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceType: true,
        amount: true,
        description: true,
        lineItems: true,
        dueDate: true,
        status: true,
        paidAt: true,
        createdAt: true,
        periodStart: true,
        periodEnd: true,
        organizationId: true,
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

    // Try to get payment token separately (may fail if column doesn't exist)
    let paymentToken: string | null = null
    try {
      const tokenResult = await prisma.$queryRawUnsafe(
        `SELECT payment_token FROM invoices WHERE id = $1::uuid`,
        invoiceId
      ) as { payment_token: string | null }[]
      paymentToken = tokenResult[0]?.payment_token || null
    } catch {
      // Column may not exist yet
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Determine recipient email
    const recipientEmail = customEmail || invoice.organization.contactEmail
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No email address provided and organization does not have a contact email' },
        { status: 400 }
      )
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

    // Skip PDF for now - send email without attachment
    // TODO: Fix PDF generation later

    // Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E3A5F; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #1E3A5F; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; background: #F5F5F5; }
            .invoice-box { background: white; border: 2px solid #9C8466; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .amount { font-size: 28px; font-weight: bold; color: #1E3A5F; margin: 10px 0; }
            .detail-row { padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; }
            .status-${invoice.status} {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-pending { background: #FEF3C7; color: #92400E; }
            .status-paid { background: #DEF7EC; color: #03543F; }
            .status-overdue { background: #FEE2E2; color: #991B1B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice from ChirhoEvents</h1>
            </div>

            <div class="content">
              <p>Dear ${invoice.organization.contactName || 'Valued Customer'},</p>

              <p>Please find your invoice details below.</p>

              <div class="invoice-box">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <div style="color: #666; font-size: 12px; text-transform: uppercase;">Invoice #</div>
                    <div style="font-size: 20px; font-weight: bold; color: #1E3A5F;">${invoice.invoiceNumber}</div>
                  </div>
                  <div style="text-align: right;">
                    <span class="status-${invoice.status}">${invoice.status.toUpperCase()}</span>
                  </div>
                </div>

                <div style="text-align: center; margin: 20px 0; padding: 20px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB;">
                  <div style="color: #666; font-size: 14px;">Amount Due</div>
                  <div class="amount">${formatCurrency(Number(invoice.amount))}</div>
                </div>

                <div class="detail-row">
                  <strong>Type:</strong> ${invoiceTypeLabels[invoice.invoiceType] || invoice.invoiceType}
                </div>
                <div class="detail-row">
                  <strong>Due Date:</strong> ${formatDate(invoice.dueDate.toISOString())}
                </div>
                ${invoice.periodStart && invoice.periodEnd ? `
                  <div class="detail-row">
                    <strong>Service Period:</strong> ${formatDate(invoice.periodStart.toISOString())} - ${formatDate(invoice.periodEnd.toISOString())}
                  </div>
                ` : ''}
              </div>

              ${invoice.status !== 'paid' ? `
                ${paymentToken ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${appUrl}/pay/invoice/${paymentToken}"
                       style="display: inline-block; background: #1E3A5F; color: white; padding: 16px 40px;
                              text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                      Pay Now
                    </a>
                  </div>
                  <p style="text-align: center; color: #666; font-size: 14px;">
                    Click the button above to pay securely online with a credit card.
                  </p>
                  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
                ` : ''}
                <p><strong>Other Payment Options:</strong></p>
                <ul style="color: #666;">
                  <li><strong>Check:</strong> Make payable to "ChirhoEvents" and mail to our billing address</li>
                  <li><strong>ACH/Wire:</strong> Contact support@chirhoevents.com for banking details</li>
                </ul>
                <p>If you have any questions about this invoice, please contact us at support@chirhoevents.com.</p>
              ` : `
                <p>Thank you for your payment!</p>
              `}

              <p>
                Best regards,<br>
                <strong>ChirhoEvents Team</strong>
              </p>
            </div>

            <div class="footer">
              <p>ChirhoEvents - Event Management for Faith Communities</p>
              <p>www.chirhoevents.com | support@chirhoevents.com</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email (without PDF attachment for now)
    let emailResult
    try {
      emailResult = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'billing@chirhoevents.com',
        to: recipientEmail,
        subject: `Invoice #${invoice.invoiceNumber} - ChirhoEvents`,
        html: emailHtml,
      })
    } catch (emailError: unknown) {
      console.error('Resend email error:', emailError)
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error'
      return NextResponse.json(
        { error: `Failed to send email: ${errorMessage}` },
        { status: 500 }
      )
    }

    // Log the email send
    await prisma.platformActivityLog.create({
      data: {
        organizationId: invoice.organizationId,
        userId: user.id,
        activityType: 'invoice_emailed',
        description: `Invoice #${invoice.invoiceNumber} emailed to ${recipientEmail}${customEmail ? ' (custom recipient)' : ''}`,
        metadata: { invoiceId: invoice.id, emailId: emailResult?.data?.id, recipientEmail },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Invoice emailed to ${recipientEmail}`,
    })
  } catch (error) {
    console.error('Invoice email error:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice email' },
      { status: 500 }
    )
  }
}
