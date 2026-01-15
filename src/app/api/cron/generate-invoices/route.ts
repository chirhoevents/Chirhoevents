import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

// Generate a secure random payment token
function generatePaymentToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Verify cron secret or master admin auth
async function verifyCronAuth(request: NextRequest): Promise<boolean> {
  // Check for cron secret (from Vercel Cron)
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // Also allow manual trigger from master admin
  const clerkUserId = request.headers.get('x-clerk-user-id')
  if (clerkUserId) {
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { role: true },
    })
    return user?.role === 'master_admin'
  }

  return false
}

// Generate invoice email HTML
function generateInvoiceEmailHtml(params: {
  organizationName: string
  invoiceNumber: number
  amount: number
  dueDate: Date
  billingPeriod: string
  paymentLink: string
}): string {
  const { organizationName, invoiceNumber, amount, dueDate, billingPeriod, paymentLink } = params
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  const formattedDueDate = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0; background-color: #1E3A5F;">
        <h1 style="color: white; margin: 0;">ChirhoEvents</h1>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #1E3A5F; margin-top: 0;">Invoice #${invoiceNumber}</h2>

        <p>Dear ${organizationName},</p>

        <p>Your subscription invoice for <strong>${billingPeriod}</strong> is now ready.</p>

        <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0; text-align: right;">#${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0;"><strong>Amount Due:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0; text-align: right; font-size: 18px; color: #1E3A5F;"><strong>${formattedAmount}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E0E0E0; text-align: right;">${formattedDueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Billing Period:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${billingPeriod}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentLink}"
             style="display: inline-block; background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Pay Invoice Online
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          You can also pay by check. Please make checks payable to <strong>ChirhoEvents</strong> and include your invoice number (#${invoiceNumber}) on the check.
        </p>

        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">

        <p>Thank you for your continued partnership!</p>

        <p>Best regards,<br><strong>ChirhoEvents Team</strong></p>
      </div>

      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #F9F9F9;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} ChirhoEvents. All rights reserved.</p>
        <p style="margin: 8px 0 0 0;">
          <a href="${paymentLink}" style="color: #9C8466;">View Invoice Online</a>
        </p>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest) {
  console.log('🔄 Starting automatic invoice generation...')

  try {
    // Verify authorization
    const isAuthorized = await verifyCronAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body for options
    let dryRun = false
    let daysAhead = 7 // Generate invoices for orgs renewing within 7 days
    try {
      const body = await request.json()
      dryRun = body.dryRun === true
      if (body.daysAhead) daysAhead = parseInt(body.daysAhead)
    } catch {
      // No body or invalid JSON, use defaults
    }

    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

    console.log(`📅 Looking for orgs renewing between now and ${cutoffDate.toISOString()}`)
    console.log(`🔍 Dry run: ${dryRun}`)

    // Find organizations due for renewal
    const orgsDueForRenewal = await prisma.organization.findMany({
      where: {
        status: 'active',
        subscriptionStatus: 'active',
        subscriptionRenewsAt: {
          lte: cutoffDate,
          not: null,
        },
        // Ensure they have pricing set
        OR: [
          { monthlyFee: { gt: 0 } },
          { monthlyPrice: { gt: 0 } },
          { annualPrice: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        subscriptionTier: true,
        billingCycle: true,
        monthlyFee: true,
        monthlyPrice: true,
        annualPrice: true,
        subscriptionRenewsAt: true,
      },
    })

    console.log(`📋 Found ${orgsDueForRenewal.length} orgs due for renewal`)

    const results = {
      processed: 0,
      invoicesCreated: 0,
      emailsSent: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as {
        orgName: string
        status: 'created' | 'skipped' | 'error'
        reason?: string
        invoiceNumber?: number
        amount?: number
      }[],
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    for (const org of orgsDueForRenewal) {
      results.processed++

      try {
        // Check if there's already a pending invoice for this org in the current period
        const existingPendingInvoice = await prisma.invoice.findFirst({
          where: {
            organizationId: org.id,
            status: { in: ['pending', 'overdue'] },
            invoiceType: 'subscription',
            // Check for invoices created in the last billing cycle
            createdAt: {
              gte: org.billingCycle === 'annual'
                ? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) // Last year
                : new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), // Last ~month
            },
          },
        })

        if (existingPendingInvoice) {
          console.log(`⏭️ Skipping ${org.name} - already has pending invoice #${existingPendingInvoice.invoiceNumber}`)
          results.skipped++
          results.details.push({
            orgName: org.name,
            status: 'skipped',
            reason: `Already has pending invoice #${existingPendingInvoice.invoiceNumber}`,
          })
          continue
        }

        // Calculate invoice amount based on billing cycle
        let amount: number
        let billingPeriod: string
        let nextRenewalDate: Date

        if (org.billingCycle === 'annual') {
          amount = Number(org.annualPrice) || 0
          const startDate = org.subscriptionRenewsAt || now
          const endDate = new Date(startDate)
          endDate.setFullYear(endDate.getFullYear() + 1)
          billingPeriod = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
          nextRenewalDate = endDate
        } else {
          // Monthly
          amount = Number(org.monthlyFee) || Number(org.monthlyPrice) || 0
          const startDate = org.subscriptionRenewsAt || now
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + 1)
          billingPeriod = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
          nextRenewalDate = endDate
        }

        if (amount <= 0) {
          console.log(`⏭️ Skipping ${org.name} - no pricing set`)
          results.skipped++
          results.details.push({
            orgName: org.name,
            status: 'skipped',
            reason: 'No pricing configured',
          })
          continue
        }

        // Set due date to 30 days from now
        const dueDate = new Date(now)
        dueDate.setDate(dueDate.getDate() + 30)

        if (dryRun) {
          console.log(`🧪 [DRY RUN] Would create invoice for ${org.name}: $${amount} (${org.billingCycle})`)
          results.invoicesCreated++
          results.details.push({
            orgName: org.name,
            status: 'created',
            amount,
            reason: '[DRY RUN] Would be created',
          })
          continue
        }

        // Generate invoice number
        const lastInvoice = await prisma.invoice.findFirst({
          orderBy: { invoiceNumber: 'desc' },
          select: { invoiceNumber: true },
        })
        const invoiceNumber = (lastInvoice?.invoiceNumber || 1000) + 1

        // Generate payment token
        const paymentToken = generatePaymentToken()

        // Create the invoice
        const invoice = await prisma.invoice.create({
          data: {
            organizationId: org.id,
            invoiceNumber,
            invoiceType: 'subscription',
            amount,
            description: `${org.subscriptionTier || 'Subscription'} - ${billingPeriod}`,
            lineItems: [
              {
                description: `${org.subscriptionTier || 'Subscription'} (${org.billingCycle || 'monthly'})`,
                amount,
              },
            ],
            status: 'pending',
            dueDate,
            periodStart: org.subscriptionRenewsAt || now,
            periodEnd: nextRenewalDate,
            paymentToken,
          },
        })

        console.log(`✅ Created invoice #${invoiceNumber} for ${org.name}: $${amount}`)
        results.invoicesCreated++

        // Update org's next renewal date
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionRenewsAt: nextRenewalDate,
          },
        })

        // Log platform activity
        await prisma.platformActivityLog.create({
          data: {
            organizationId: org.id,
            activityType: 'invoice_created',
            description: `Auto-generated invoice #${invoiceNumber} for $${amount} (${billingPeriod})`,
            metadata: {
              invoiceId: invoice.id,
              invoiceNumber,
              amount,
              billingPeriod,
              autoGenerated: true,
            },
          },
        })

        // Send invoice email
        const paymentLink = `${appUrl}/pay/invoice/${paymentToken}`

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'billing@chirhoevents.com',
            to: org.contactEmail,
            subject: `Invoice #${invoiceNumber} - ${billingPeriod}`,
            html: generateInvoiceEmailHtml({
              organizationName: org.name,
              invoiceNumber,
              amount,
              dueDate,
              billingPeriod,
              paymentLink,
            }),
          })

          console.log(`📧 Sent invoice email to ${org.contactEmail}`)
          results.emailsSent++
        } catch (emailError) {
          console.error(`⚠️ Failed to send email to ${org.contactEmail}:`, emailError)
          results.errors.push(`Email failed for ${org.name}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`)
        }

        results.details.push({
          orgName: org.name,
          status: 'created',
          invoiceNumber,
          amount,
        })
      } catch (error) {
        console.error(`❌ Error processing ${org.name}:`, error)
        results.errors.push(`${org.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.details.push({
          orgName: org.name,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log(`
📊 Invoice Generation Complete:
   - Processed: ${results.processed}
   - Invoices Created: ${results.invoicesCreated}
   - Emails Sent: ${results.emailsSent}
   - Skipped: ${results.skipped}
   - Errors: ${results.errors.length}
    `)

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        processed: results.processed,
        invoicesCreated: results.invoicesCreated,
        emailsSent: results.emailsSent,
        skipped: results.skipped,
        errors: results.errors.length,
      },
      details: results.details,
      errors: results.errors,
    })
  } catch (error) {
    console.error('❌ Invoice generation failed:', error)
    return NextResponse.json(
      { error: 'Invoice generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for checking status / manual trigger info
export async function GET(request: NextRequest) {
  try {
    // Get count of orgs due for renewal in next 7 days
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() + 7)

    const orgsDueCount = await prisma.organization.count({
      where: {
        status: 'active',
        subscriptionStatus: 'active',
        subscriptionRenewsAt: {
          lte: cutoffDate,
          not: null,
        },
        OR: [
          { monthlyFee: { gt: 0 } },
          { monthlyPrice: { gt: 0 } },
          { annualPrice: { gt: 0 } },
        ],
      },
    })

    // Get count of pending invoices
    const pendingInvoicesCount = await prisma.invoice.count({
      where: {
        status: 'pending',
        invoiceType: 'subscription',
      },
    })

    return NextResponse.json({
      status: 'ready',
      orgsDueForRenewal: orgsDueCount,
      pendingSubscriptionInvoices: pendingInvoicesCount,
      message: `${orgsDueCount} organizations are due for renewal in the next 7 days`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
