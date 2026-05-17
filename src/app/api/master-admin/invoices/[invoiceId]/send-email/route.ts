import { NextRequest, NextResponse } from 'next/server'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })
    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { invoiceId } = await params
    const body = await request.json().catch(() => ({}))
    const customEmail: string | undefined = body.email || undefined

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: {
          select: { id: true, name: true, contactEmail: true },
        },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
    if (invoice.status === 'cancelled') return NextResponse.json({ error: 'Invoice is cancelled' }, { status: 400 })

    // Ensure a payment token exists
    let { paymentToken } = invoice
    if (!paymentToken) {
      paymentToken = crypto.randomBytes(32).toString('hex')
      await prisma.invoice.update({ where: { id: invoiceId }, data: { paymentToken } })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const paymentUrl = `${appUrl}/pay/invoice/${paymentToken}`
    const toEmail = customEmail || invoice.organization.contactEmail
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const invoiceTypeLabels: Record<string, string> = {
      setup_fee: 'Setup Fee',
      subscription: 'Subscription',
      reactivation_fee: 'Reactivation Fee',
      custom: 'Invoice',
    }
    const typeLabel = invoiceTypeLabels[invoice.invoiceType] || 'Invoice'

    await resend.emails.send({
      from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
      reply_to: 'support@chirhoevents.com',
      to: toEmail,
      subject: `Invoice #${invoice.invoiceNumber} — $${Number(invoice.amount).toFixed(2)} Due ${dueDate}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; color: #1E3A5F; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto;">
              <div style="background: #1E3A5F; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">ChiRho Events</h1>
              </div>
              <div style="padding: 30px; background: #F5F5F5;">
                <h2 style="color: #1E3A5F;">Invoice #${invoice.invoiceNumber} — ${typeLabel}</h2>
                <p>Dear ${invoice.organization.name},</p>
                <p>${invoice.description || `Please find your ${typeLabel.toLowerCase()} invoice below.`}</p>
                <div style="background: white; border: 2px solid #9C8466; border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center;">
                  <p style="font-size: 14px; color: #666; margin: 0;">Amount Due</p>
                  <p style="font-size: 40px; font-weight: bold; color: #1E3A5F; margin: 10px 0;">$${Number(invoice.amount).toFixed(2)}</p>
                  <p style="font-size: 14px; color: #666; margin: 0;">Due by ${dueDate}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentUrl}" style="display: inline-block; background: #9C8466; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Pay Now
                  </a>
                </div>
                <p style="font-size: 13px; color: #666; text-align: center;">
                  Or copy this link: <a href="${paymentUrl}" style="color: #1E3A5F;">${paymentUrl}</a>
                </p>
                <p>If you have any questions, please contact us at <a href="mailto:support@chirhoevents.com" style="color: #1E3A5F;">support@chirhoevents.com</a>.</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
                <p>ChiRho Events — Event Management for Faith Communities</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    await prisma.platformActivityLog.create({
      data: {
        organizationId: invoice.organization.id,
        userId: user.id,
        activityType: 'invoice_email_sent',
        description: `Invoice #${invoice.invoiceNumber} email sent to ${toEmail}`,
        metadata: { invoiceId, toEmail },
      },
    })

    return NextResponse.json({ success: true, message: `Invoice email sent to ${toEmail}` })
  } catch (error) {
    console.error('Send invoice email error:', error)
    return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500 })
  }
}
