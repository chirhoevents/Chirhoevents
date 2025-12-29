import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

// POST: Send email from Rapha
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const body = await request.json()

    // Check Rapha access permission
    if (!hasPermission(user.role, 'rapha.access')) {
      return NextResponse.json(
        { message: 'Access denied. Rapha access required.' },
        { status: 403 }
      )
    }

    // Verify event exists and belongs to user's org
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(user.role !== 'master_admin' ? { organizationId: user.organizationId } : {}),
      },
      include: {
        organization: {
          select: { name: true, contactEmail: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      )
    }

    const {
      recipientEmail,
      recipientName,
      participantName,
      subject,
      message,
      liabilityFormId,
    } = body

    if (!recipientEmail || !subject || !message) {
      return NextResponse.json(
        { message: 'Missing required fields: recipientEmail, subject, message' },
        { status: 400 }
      )
    }

    // Build email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #0077BE 0%, #005a8c 100%);
            color: white;
            padding: 24px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content {
            background: white;
            padding: 32px;
            border-radius: 0 0 8px 8px;
          }
          .participant-info {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .participant-info h3 {
            margin: 0 0 4px 0;
            color: #0077BE;
            font-size: 16px;
          }
          .participant-info p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
          .message {
            white-space: pre-wrap;
            font-size: 15px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
          .signature {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #eee;
          }
          .signature p {
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Medical Staff Update</h1>
            <p>${event.name}</p>
          </div>
          <div class="content">
            ${participantName ? `
              <div class="participant-info">
                <h3>Regarding: ${participantName}</h3>
                <p>${event.name}</p>
              </div>
            ` : ''}
            <div class="message">${message.replace(/\n/g, '<br>')}</div>
            <div class="signature">
              <p><strong>${user.firstName} ${user.lastName}</strong></p>
              <p>Medical Staff - ${event.organization.name}</p>
              <p style="color: #999; font-size: 12px; margin-top: 8px;">
                Sent via Rapha Medical Platform
              </p>
            </div>
          </div>
          <div class="footer">
            <p>${event.organization.name}</p>
            <p style="color: #999;">This email was sent from the Rapha Medical Platform regarding a participant at ${event.name}.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Determine from address
    const fromName = event.organization.name
    const fromEmail = 'notifications@chirhoevents.com'

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      reply_to: user.email || undefined,
    })

    if (error) {
      console.error('Resend error:', error)

      // Log failed email
      await logEmailFailure(
        {
          organizationId: event.organizationId,
          eventId,
          recipientEmail,
          recipientName: recipientName || participantName,
          emailType: 'rapha_parent_notification',
          subject,
          htmlContent,
          metadata: { liabilityFormId, sentBy: user.id },
        },
        error.message || 'Unknown error'
      )

      return NextResponse.json(
        { message: 'Failed to send email', error: error.message },
        { status: 500 }
      )
    }

    // Log successful email
    await logEmail({
      organizationId: event.organizationId,
      eventId,
      recipientEmail,
      recipientName: recipientName || participantName,
      emailType: 'rapha_parent_notification',
      subject,
      htmlContent,
      metadata: { liabilityFormId, sentBy: user.id, resendId: data?.id },
    })

    // Log access for HIPAA compliance
    await prisma.medicalAccessLog.create({
      data: {
        eventId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: 'send_parent_email',
        resourceType: 'parent_notification',
        resourceId: liabilityFormId || 'unknown',
        details: `Sent email to ${recipientEmail} regarding ${participantName || 'participant'}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: data?.id,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    return NextResponse.json(
      { message: 'Failed to send email' },
      { status: 500 }
    )
  }
}
