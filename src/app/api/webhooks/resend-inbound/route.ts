import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { wrapEmail, emailInfoBox } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

// Address used as the From: on outbound replies. Choose an address that is NOT
// configured in EmailForward so recipient "Reply" responses don't loop back
// into the support inbox and spawn new tickets. Falls back to RESEND_FROM_EMAIL.
function getReplyFromEmail(): string {
  return (
    process.env.RESEND_REPLY_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'notifications@chirhoevents.com'
  )
}

// Pull a ticket number out of "[Ticket #123]" markers in the subject or the
// In-Reply-To / References headers we previously embedded.
function extractTicketNumber(...candidates: (string | string[] | null | undefined)[]): number | null {
  const pattern = /\[Ticket\s*#(\d+)\]/i
  for (const c of candidates) {
    if (!c) continue
    const values = Array.isArray(c) ? c : [c]
    for (const v of values) {
      const m = v?.match(pattern)
      if (m) {
        const n = parseInt(m[1], 10)
        if (!Number.isNaN(n)) return n
      }
    }
  }
  return null
}

// Verify webhook signature from Resend (uses Svix)
function verifyWebhookSignature(
  body: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null
): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  if (!svixId || !svixTimestamp || !svixSignature || !webhookSecret) {
    console.error('[Resend Webhook] Missing signature headers or webhook secret')
    return false
  }

  try {
    // Resend/Svix signature format: "v1,<base64_signature>"
    // The signed content is: "${svix_id}.${svix_timestamp}.${body}"
    const signedContent = `${svixId}.${svixTimestamp}.${body}`

    // Extract the secret (remove "whsec_" prefix if present)
    const secretBytes = Buffer.from(
      webhookSecret.startsWith('whsec_')
        ? webhookSecret.slice(6)
        : webhookSecret,
      'base64'
    )

    const hmac = createHmac('sha256', secretBytes)
    const expectedSignature = hmac.update(signedContent).digest('base64')

    // Svix signature header can contain multiple signatures separated by spaces
    // Format: "v1,<sig1> v1,<sig2>"
    const signatures = svixSignature.split(' ')

    for (const sig of signatures) {
      const [version, signature] = sig.split(',')
      if (version === 'v1' && signature) {
        try {
          const sigBuffer = Buffer.from(signature, 'base64')
          const expectedBuffer = Buffer.from(expectedSignature, 'base64')
          if (sigBuffer.length === expectedBuffer.length &&
              timingSafeEqual(sigBuffer, expectedBuffer)) {
            return true
          }
        } catch {
          // Continue to next signature
        }
      }
    }

    console.error('[Resend Webhook] No matching signature found')
    return false
  } catch (error) {
    console.error('[Resend Webhook] Signature verification error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Resend uses Svix headers for webhook signatures
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    // Verify webhook is from Resend (skip if no secret configured)
    if (process.env.RESEND_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(body, svixId, svixTimestamp, svixSignature)) {
        console.error('[Resend Webhook] Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)

    console.log('[Resend Webhook] Received event:', event.type)

    if (event.type === 'email.received') {
      await handleInboundEmail(event.data)
      return NextResponse.json({ received: true })
    }

    // Handle other webhook events if needed
    console.log('[Resend Webhook] Unhandled event type:', event.type)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleInboundEmail(emailData: any) {
  console.log('[Resend Webhook] === Processing inbound email ===')
  console.log('[Resend Webhook] Email ID:', emailData.email_id)

  try {
    // Webhook only sends metadata - must fetch content from Receiving API
    let textBody: string | null = null
    let htmlBody: string | null = null

    if (emailData.email_id) {
      try {
        console.log('[Resend Webhook] Fetching content from Receiving API...')

        // Correct endpoint: GET /emails/receiving/{email_id}
        const response = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
        })

        if (response.ok) {
          const emailContent = await response.json()
          console.log('[Resend Webhook] Received email content fields:', Object.keys(emailContent))
          textBody = emailContent.text || null
          htmlBody = emailContent.html || null
          console.log('[Resend Webhook] Text length:', textBody?.length || 0)
          console.log('[Resend Webhook] HTML length:', htmlBody?.length || 0)
        } else {
          const errorText = await response.text()
          console.error('[Resend Webhook] API error:', response.status, errorText)
        }
      } catch (fetchError) {
        console.error('[Resend Webhook] Fetch error:', fetchError)
      }
    }

    console.log('[Resend Webhook] Final text body:', textBody ? 'present' : 'null')
    console.log('[Resend Webhook] Final html body:', htmlBody ? 'present' : 'null')

    // 1. Save raw email to database
    const receivedEmail = await prisma.receivedEmail.create({
      data: {
        resendEmailId: emailData.email_id || emailData.id || `inbound_${Date.now()}`,
        fromAddress: emailData.from || '',
        toAddresses: emailData.to || [],
        ccAddresses: emailData.cc || [],
        bccAddresses: emailData.bcc || [],
        subject: emailData.subject || '(No Subject)',
        textBody: textBody,
        htmlBody: htmlBody,
        messageId: emailData.message_id || null,
        attachments: emailData.attachments || null,
      },
    })

    console.log('[Resend Webhook] Email saved to database:', receivedEmail.id)

    // 2. If this email references an existing ticket (via [Ticket #N] in the
    //    subject or In-Reply-To/References headers), thread it as a reply
    //    rather than creating a new ticket. Stops the auto-reply ping-pong.
    const referencedTicketNumber = extractTicketNumber(
      emailData.subject,
      emailData.in_reply_to,
      emailData.references,
    )

    if (referencedTicketNumber) {
      const existingTicket = await prisma.inboundSupportTicket.findUnique({
        where: { ticketNumber: referencedTicketNumber },
      })

      if (existingTicket) {
        const fromMatch = (emailData.from || '').match(/^(.*?)\s*<(.+?)>$/)
        const senderEmail = fromMatch ? fromMatch[2].trim() : (emailData.from || 'unknown@unknown.com')

        await prisma.inboundTicketReply.create({
          data: {
            ticketId: existingTicket.id,
            fromEmail: senderEmail,
            message: textBody || htmlBody || '(No message body)',
            isInternal: false,
          },
        })

        // Reopen tickets that had moved past waiting/resolved so they show up again.
        if (
          existingTicket.status === 'waiting_reply' ||
          existingTicket.status === 'resolved' ||
          existingTicket.status === 'closed'
        ) {
          await prisma.inboundSupportTicket.update({
            where: { id: existingTicket.id },
            data: { status: 'open' },
          })
        }

        await prisma.receivedEmail.update({
          where: { id: receivedEmail.id },
          data: { processed: true, processedAt: new Date() },
        })

        console.log('[Resend Webhook] Reply threaded into ticket #', referencedTicketNumber)
        return
      }
    }

    // 3. Find routing config for the TO address
    const toAddress = (emailData.to?.[0] || '').toLowerCase()

    const forwardConfig = await prisma.emailForward.findFirst({
      where: {
        fromAddress: {
          equals: toAddress,
          mode: 'insensitive',
        },
        active: true,
      },
    })

    // 4. Only create tickets / auto-reply for addresses explicitly opted in.
    //    Emails to anything else (events@, noreply@, outreach@…) are stored
    //    in ReceivedEmail and viewable in the master-admin Emails inbox,
    //    but don't generate a ticket or auto-response.
    let ticket = null
    if (forwardConfig?.createTicket) {
      ticket = await createInboundTicket(emailData, receivedEmail.id, textBody, htmlBody)
      console.log('[Resend Webhook] Inbound ticket created:', ticket.ticketNumber)

      if (forwardConfig.autoReply && forwardConfig.autoReplyText) {
        await sendAutoReply(emailData, ticket.ticketNumber, forwardConfig.autoReplyText)
      } else if (forwardConfig.autoReply) {
        await sendDefaultAutoReply(emailData, ticket.ticketNumber)
      }
    } else {
      console.log('[Resend Webhook] No ticket created — address not configured for tickets:', toAddress)
    }

    // 5. Forward email if configured
    if (forwardConfig?.forwardTo && forwardConfig.forwardTo.length > 0) {
      await forwardEmail(emailData, ticket, forwardConfig.forwardTo)
    }

    // 6. Mark email as processed
    await prisma.receivedEmail.update({
      where: { id: receivedEmail.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })

    console.log('[Resend Webhook] Email processing complete')
  } catch (error) {
    console.error('[Resend Webhook] Error handling inbound email:', error)
    throw error
  }
}

async function createInboundTicket(
  emailData: any,
  receivedEmailId: string,
  textBody: string | null,
  htmlBody: string | null
) {
  // Extract sender name from "Name <email>" format
  const fromMatch = (emailData.from || '').match(/^(.*?)\s*<(.+?)>$/)
  const fromName = fromMatch ? fromMatch[1].trim() : null
  const fromEmail = fromMatch ? fromMatch[2].trim() : (emailData.from || 'unknown@unknown.com')

  // Determine category from subject
  const subject = (emailData.subject || '').toLowerCase()
  let category = 'general'
  if (subject.includes('payment') || subject.includes('billing') || subject.includes('invoice')) {
    category = 'billing'
  } else if (subject.includes('bug') || subject.includes('error') || subject.includes('problem') || subject.includes('issue')) {
    category = 'technical'
  } else if (subject.includes('feature') || subject.includes('suggest') || subject.includes('request')) {
    category = 'feature_request'
  } else if (subject.includes('privacy') || subject.includes('gdpr') || subject.includes('data')) {
    category = 'privacy'
  } else if (subject.includes('legal') || subject.includes('terms') || subject.includes('contract')) {
    category = 'legal'
  }

  // Use the fetched body content
  const messageBody = textBody || htmlBody || '(No message body)'

  const ticket = await prisma.inboundSupportTicket.create({
    data: {
      receivedEmailId,
      fromEmail,
      fromName: fromName || null,
      subject: emailData.subject || '(No Subject)',
      message: messageBody,
      category,
      status: 'open',
      priority: 'normal',
    },
  })

  return ticket
}

async function sendAutoReply(emailData: any, ticketNumber: number, autoReplyTemplate: string) {
  console.log('[Resend Webhook] Sending auto-reply...')

  const autoReplyText = autoReplyTemplate
    .replace(/{ticket_number}/g, ticketNumber.toString())
    .replace(/#{ticket_number}/g, `#${ticketNumber}`)

  try {
    const fromEmail = getReplyFromEmail()

    await resend.emails.send({
      from: `ChiRho Events Support <${fromEmail}>`,
      reply_to: fromEmail,
      to: emailData.from,
      subject: `Re: ${emailData.subject || 'Your inquiry'} [Ticket #${ticketNumber}]`,
      html: wrapEmail(`
        <h1>We've Received Your Message</h1>

        ${autoReplyText.split('\n').map((line: string) => `<p>${line}</p>`).join('')}

        <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your ticket number</p>
          <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #1E3A5F; font-family: monospace;">
            #${ticketNumber}
          </p>
        </div>

        <p>Please include this ticket number in any follow-up emails.</p>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>ChiRho Events Support Team</strong>
        </p>
      `, { organizationName: 'ChiRho Events' }),
    })

    console.log('[Resend Webhook] Auto-reply sent')
  } catch (error) {
    console.error('[Resend Webhook] Error sending auto-reply:', error)
  }
}

async function sendDefaultAutoReply(emailData: any, ticketNumber: number) {
  console.log('[Resend Webhook] Sending default auto-reply...')

  try {
    const fromEmail = getReplyFromEmail()

    await resend.emails.send({
      from: `ChiRho Events Support <${fromEmail}>`,
      reply_to: fromEmail,
      to: emailData.from,
      subject: `Re: ${emailData.subject || 'Your inquiry'} [Ticket #${ticketNumber}]`,
      html: wrapEmail(`
        <h1>Thank You for Contacting Us</h1>

        <p>We've received your message and will respond within 24 hours.</p>

        <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your ticket number</p>
          <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #1E3A5F; font-family: monospace;">
            #${ticketNumber}
          </p>
        </div>

        ${emailInfoBox(`
          <strong>Please keep this ticket number</strong> for your reference. Include it in any follow-up emails to help us assist you faster.
        `, 'info')}

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>ChiRho Events Support Team</strong>
        </p>
      `, { organizationName: 'ChiRho Events' }),
    })

    console.log('[Resend Webhook] Default auto-reply sent')
  } catch (error) {
    console.error('[Resend Webhook] Error sending default auto-reply:', error)
  }
}

async function forwardEmail(emailData: any, ticket: any, forwardTo: string[]) {
  console.log('[Resend Webhook] Forwarding email to:', forwardTo)

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'
    const ticketInfo = ticket ? `[Ticket #${ticket.ticketNumber}] ` : ''

    await resend.emails.send({
      from: `ChiRho Events <${fromEmail}>`,
      reply_to: emailData.from,
      to: forwardTo,
      subject: `${ticketInfo}${emailData.subject || '(No Subject)'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .alert { background: #F5F1E8; padding: 15px; border-left: 4px solid #1E3A5F; margin-bottom: 20px; border-radius: 4px; }
            .email-body { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="alert">
            <strong>📧 Inbound Email${ticket ? ` - Ticket #${ticket.ticketNumber}` : ''}</strong><br>
            <strong>From:</strong> ${emailData.from}<br>
            ${ticket?.category ? `<strong>Category:</strong> ${ticket.category}<br>` : ''}
            <strong>Received:</strong> ${new Date().toLocaleString()}
          </div>

          <div class="email-body">
            <p><strong>Subject:</strong> ${emailData.subject || '(No Subject)'}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
            ${emailData.html || `<pre style="white-space: pre-wrap; font-family: inherit;">${emailData.text || '(No message body)'}</pre>`}
          </div>

          ${ticket ? `
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              View in admin dashboard:
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'}/dashboard/master-admin/inbound-tickets/${ticket.id}">
                Open Ticket #${ticket.ticketNumber}
              </a>
            </p>
          ` : ''}
        </body>
        </html>
      `,
    })

    console.log('[Resend Webhook] Email forwarded successfully')
  } catch (error) {
    console.error('[Resend Webhook] Error forwarding email:', error)
  }
}
