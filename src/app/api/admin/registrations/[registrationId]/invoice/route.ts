import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const registrationType = searchParams.get('type')

    if (!registrationType || !['group', 'individual'].includes(registrationType)) {
      return NextResponse.json(
        { error: 'Invalid registration type. Must be "group" or "individual".' },
        { status: 400 }
      )
    }

    const registrationId = params.registrationId

    // Get organization info
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId! },
      select: {
        name: true,
        contactEmail: true,
        contactPhone: true,
        contactName: true,
        address: true,
      },
    })

    let registrationData: any = null
    let eventData: any = null

    if (registrationType === 'group') {
      const registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
              locationName: true,
            },
          },
          participants: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              participantType: true,
            },
          },
        },
      })

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      if (registration.organizationId !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      registrationData = {
        type: 'group',
        name: registration.groupName,
        contactName: `${registration.leaderFirstName} ${registration.leaderLastName}`,
        email: registration.leaderEmail,
        phone: registration.leaderPhone,
        parish: registration.parishName,
        diocese: registration.dioceseName,
        participantCount: registration.participants.length,
        participants: registration.participants,
        createdAt: registration.createdAt,
        accessCode: registration.accessCode,
      }
      eventData = registration.event
    } else {
      const registration = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        include: {
          event: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
              locationName: true,
            },
          },
        },
      })

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
      }

      if (registration.organizationId !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      registrationData = {
        type: 'individual',
        name: `${registration.firstName} ${registration.lastName}`,
        contactName: `${registration.firstName} ${registration.lastName}`,
        email: registration.email,
        phone: registration.phone,
        participantCount: 1,
        createdAt: registration.createdAt,
      }
      eventData = registration.event
    }

    // Fetch payment balance
    const paymentBalance = await prisma.paymentBalance.findUnique({
      where: { registrationId },
    })

    // Fetch payments
    const payments = await prisma.payment.findMany({
      where: {
        registrationId,
        registrationType,
        paymentStatus: { in: ['completed', 'received', 'succeeded'] },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Fetch refunds
    const refunds = await prisma.refund.findMany({
      where: {
        registrationId,
        registrationType,
        status: 'completed',
      },
      orderBy: { createdAt: 'asc' },
    })

    // Generate invoice number based on registration ID and date
    const invoiceNumber = `INV-${registrationId.slice(-8).toUpperCase()}`
    const invoiceDate = format(new Date(), 'MMMM d, yyyy')

    // Calculate totals
    const totalDue = paymentBalance ? Number(paymentBalance.totalAmountDue) : 0
    const totalPaid = paymentBalance ? Number(paymentBalance.amountPaid) : 0
    const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.refundAmount), 0)
    const balanceRemaining = paymentBalance ? Number(paymentBalance.amountRemaining) : 0

    // Generate HTML invoice
    const html = generateInvoiceHTML({
      organization,
      registration: registrationData,
      event: eventData,
      invoiceNumber,
      invoiceDate,
      payments,
      refunds,
      totalDue,
      totalPaid,
      totalRefunded,
      balanceRemaining,
    })

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface InvoiceData {
  organization: any
  registration: any
  event: any
  invoiceNumber: string
  invoiceDate: string
  payments: any[]
  refunds: any[]
  totalDue: number
  totalPaid: number
  totalRefunded: number
  balanceRemaining: number
}

function generateInvoiceHTML(data: InvoiceData): string {
  const {
    organization,
    registration,
    event,
    invoiceNumber,
    invoiceDate,
    payments,
    refunds,
    totalDue,
    totalPaid,
    totalRefunded,
    balanceRemaining,
  } = data

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatDate = (date: Date | string) => format(new Date(date), 'MMM d, yyyy')
  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      stripe: 'Credit Card',
      card: 'Credit Card',
      check: 'Check',
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      other: 'Other',
    }
    return methods[method] || method
  }

  // Generate line items for participants if group registration
  let lineItemsHTML = ''
  if (registration.type === 'group' && registration.participants) {
    const youthCount = registration.participants.filter(
      (p: any) => p.participantType === 'youth_u18' || p.participantType === 'youth_o18'
    ).length
    const chaperoneCount = registration.participants.filter(
      (p: any) => p.participantType === 'chaperone'
    ).length
    const priestCount = registration.participants.filter(
      (p: any) => p.participantType === 'priest'
    ).length

    if (youthCount > 0) {
      lineItemsHTML += `
        <tr>
          <td>Youth Registration</td>
          <td style="text-align: center;">${youthCount}</td>
          <td style="text-align: right;">--</td>
        </tr>
      `
    }
    if (chaperoneCount > 0) {
      lineItemsHTML += `
        <tr>
          <td>Chaperone Registration</td>
          <td style="text-align: center;">${chaperoneCount}</td>
          <td style="text-align: right;">--</td>
        </tr>
      `
    }
    if (priestCount > 0) {
      lineItemsHTML += `
        <tr>
          <td>Clergy Registration</td>
          <td style="text-align: center;">${priestCount}</td>
          <td style="text-align: right;">--</td>
        </tr>
      `
    }
  } else {
    lineItemsHTML = `
      <tr>
        <td>Individual Registration</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">${formatCurrency(totalDue)}</td>
      </tr>
    `
  }

  // Generate payments history
  let paymentsHTML = ''
  if (payments.length > 0) {
    paymentsHTML = payments.map((p) => `
      <tr>
        <td>${formatDate(p.createdAt)}</td>
        <td>${formatPaymentMethod(p.paymentMethod)}${p.checkNumber ? ` #${p.checkNumber}` : ''}${p.cardLast4 ? ` ****${p.cardLast4}` : ''}</td>
        <td style="text-align: right;">${formatCurrency(Number(p.amount))}</td>
      </tr>
    `).join('')
  } else {
    paymentsHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: #666;">No payments recorded</td>
      </tr>
    `
  }

  // Generate refunds if any
  let refundsHTML = ''
  if (refunds.length > 0) {
    refundsHTML = `
      <div style="margin-top: 30px;">
        <h3 style="color: #1E3A5F; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Refunds</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Date</th>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Reason</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${refunds.map((r) => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatDate(r.createdAt)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${r.refundReason?.replace(/_/g, ' ') || 'Refund'}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #c00;">-${formatCurrency(Number(r.refundAmount))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #fff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      border-bottom: 3px solid #1E3A5F;
      padding-bottom: 20px;
    }
    .header-left h1 {
      color: #1E3A5F;
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header-left p {
      color: #666;
      font-size: 14px;
    }
    .header-right {
      text-align: right;
    }
    .header-right h2 {
      color: #1E3A5F;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header-right p {
      color: #666;
      font-size: 14px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .info-box {
      flex: 1;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
      margin: 0 10px;
    }
    .info-box:first-child {
      margin-left: 0;
    }
    .info-box:last-child {
      margin-right: 0;
    }
    .info-box h3 {
      color: #1E3A5F;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .info-box p {
      font-size: 14px;
      margin-bottom: 3px;
    }
    .info-box .primary {
      font-weight: 600;
      color: #1E3A5F;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #1E3A5F;
      color: #fff;
      padding: 12px;
      text-align: left;
    }
    th:last-child {
      text-align: right;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table tr td {
      padding: 8px 12px;
    }
    .totals-table tr td:first-child {
      text-align: right;
      font-weight: 500;
    }
    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .totals-table .total-row {
      background-color: #1E3A5F;
      color: #fff;
    }
    .totals-table .total-row td {
      font-size: 16px;
      font-weight: 700;
    }
    .balance-due {
      background-color: ${balanceRemaining > 0 ? '#fff3cd' : '#d4edda'};
    }
    .balance-due td {
      color: ${balanceRemaining > 0 ? '#856404' : '#155724'};
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-paid {
      background-color: #d4edda;
      color: #155724;
    }
    .status-partial {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-unpaid {
      background-color: #f8d7da;
      color: #721c24;
    }
    @media print {
      body {
        background-color: #fff;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
    .print-button {
      background-color: #1E3A5F;
      color: #fff;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .print-button:hover {
      background-color: #2A4A6F;
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 20px;">
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <h1>${organization?.name || 'Organization'}</h1>
        ${organization?.contactEmail ? `<p>${organization.contactEmail}</p>` : ''}
        ${organization?.contactPhone ? `<p>${organization.contactPhone}</p>` : ''}
        ${(() => {
          if (organization?.address && typeof organization.address === 'object') {
            const addr = organization.address as Record<string, string>
            const parts = []
            if (addr.street) parts.push(`<p>${addr.street}</p>`)
            const cityLine = [addr.city, addr.state].filter(Boolean).join(', ')
            if (cityLine || addr.zip) parts.push(`<p>${cityLine} ${addr.zip || ''}</p>`)
            return parts.join('')
          }
          return ''
        })()}
      </div>
      <div class="header-right">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p style="margin-top: 10px;">
          <span class="status-badge ${balanceRemaining === 0 ? 'status-paid' : totalPaid > 0 ? 'status-partial' : 'status-unpaid'}">
            ${balanceRemaining === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}
          </span>
        </p>
      </div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>Bill To</h3>
        <p class="primary">${registration.name}</p>
        ${registration.parish ? `<p>${registration.parish}</p>` : ''}
        ${registration.diocese ? `<p>${registration.diocese}</p>` : ''}
        <p>${registration.email}</p>
        ${registration.phone ? `<p>${registration.phone}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Event Details</h3>
        <p class="primary">${event?.name || 'Event'}</p>
        ${event?.startDate ? `<p>${formatDate(event.startDate)}${event.endDate ? ` - ${formatDate(event.endDate)}` : ''}</p>` : ''}
        ${event?.locationName ? `<p>${event.locationName}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Registration Info</h3>
        <p><strong>Type:</strong> ${registration.type === 'group' ? 'Group' : 'Individual'}</p>
        <p><strong>Participants:</strong> ${registration.participantCount}</p>
        <p><strong>Registered:</strong> ${formatDate(registration.createdAt)}</p>
        ${registration.accessCode ? `<p><strong>Access Code:</strong> ${registration.accessCode}</p>` : ''}
      </div>
    </div>

    <h3 style="color: #1E3A5F; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Registration Details</h3>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHTML}
        <tr style="background-color: #f5f5f5; font-weight: 600;">
          <td colspan="2">Total Registration Cost</td>
          <td style="text-align: right;">${formatCurrency(totalDue)}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="color: #1E3A5F; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Payment History</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Method</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${paymentsHTML}
      </tbody>
    </table>

    ${refundsHTML}

    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td>Total Due:</td>
          <td>${formatCurrency(totalDue)}</td>
        </tr>
        <tr>
          <td>Amount Paid:</td>
          <td>${formatCurrency(totalPaid)}</td>
        </tr>
        ${totalRefunded > 0 ? `
        <tr>
          <td>Refunded:</td>
          <td style="color: #c00;">-${formatCurrency(totalRefunded)}</td>
        </tr>
        ` : ''}
        <tr class="balance-due">
          <td>Balance Due:</td>
          <td>${formatCurrency(balanceRemaining)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p>Thank you for your registration!</p>
      <p>If you have any questions, please contact us at ${organization?.contactEmail || 'our office'}.</p>
      <p style="margin-top: 10px;">Generated on ${invoiceDate}</p>
    </div>
  </div>
</body>
</html>
  `
}
