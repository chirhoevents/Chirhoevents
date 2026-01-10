import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { wrapEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

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
  const authResult = await auth()
  if (authResult.userId) {
    return authResult.userId
  }

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

// Reply to a received email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params
    const clerkUserId = await getClerkUserId(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true, firstName: true, lastName: true },
    })

    if (!user || user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { subject, message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get the original email
    const originalEmail = await prisma.receivedEmail.findUnique({
      where: { id: emailId },
      include: {
        inboundTicket: true,
      },
    })

    if (!originalEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Prepare reply subject
    const replySubject = subject || (
      originalEmail.subject?.startsWith('Re:')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject || 'Your inquiry'}`
    )

    // Include ticket number if exists
    const ticketInfo = originalEmail.inboundTicket
      ? `[Ticket #${originalEmail.inboundTicket.ticketNumber}] `
      : ''

    const finalSubject = ticketInfo + replySubject

    // Build the reply email HTML
    const replyHtml = wrapEmail(`
      <div style="margin-bottom: 24px;">
        ${message.split('\n').map((line: string) => `<p style="margin: 0 0 8px 0;">${line || '&nbsp;'}</p>`).join('')}
      </div>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>${user.firstName} ${user.lastName}</strong><br>
        <span style="color: #666;">ChiRho Events Support Team</span>
      </p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

      <div style="color: #666; font-size: 14px;">
        <p style="margin: 0 0 8px 0;"><strong>Original Message:</strong></p>
        <p style="margin: 0 0 4px 0;"><strong>From:</strong> ${originalEmail.fromAddress}</p>
        <p style="margin: 0 0 4px 0;"><strong>Subject:</strong> ${originalEmail.subject || '(No subject)'}</p>
        <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${new Date(originalEmail.createdAt).toLocaleString()}</p>
        <blockquote style="border-left: 3px solid #ddd; margin: 16px 0; padding-left: 16px; color: #555;">
          ${originalEmail.htmlBody || originalEmail.textBody?.split('\n').map(l => `<p style="margin: 0 0 8px 0;">${l}</p>`).join('') || '(No content)'}
        </blockquote>
      </div>
    `, { organizationName: 'ChiRho Events' })

    // Send the reply
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'support@chirhoevents.com'

    const result = await resend.emails.send({
      from: `ChiRho Events Support <${fromEmail}>`,
      reply_to: fromEmail,
      to: originalEmail.fromAddress,
      subject: finalSubject,
      html: replyHtml,
    })

    // Log the sent email
    await prisma.emailLog.create({
      data: {
        organizationId: '00000000-0000-0000-0000-000000000000', // Platform-level
        recipientEmail: originalEmail.fromAddress,
        recipientName: null,
        emailType: 'inbound_reply',
        subject: finalSubject,
        htmlContent: replyHtml,
        sentAt: new Date(),
        sentVia: 'resend',
        sentStatus: 'sent',
        metadata: {
          replyToEmailId: emailId,
          sentByUserId: user.id,
          resendEmailId: result.data?.id,
        },
      },
    })

    // If there's an associated ticket, add a reply to it
    if (originalEmail.inboundTicket) {
      await prisma.inboundTicketReply.create({
        data: {
          ticketId: originalEmail.inboundTicket.id,
          userId: user.id,
          message: message,
          isInternal: false,
        },
      })

      // Update ticket status to in_progress if it was open
      if (originalEmail.inboundTicket.status === 'open') {
        await prisma.inboundSupportTicket.update({
          where: { id: originalEmail.inboundTicket.id },
          data: { status: 'waiting_reply' },
        })
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
    })
  } catch (error) {
    console.error('Reply to email error:', error)
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    )
  }
}
