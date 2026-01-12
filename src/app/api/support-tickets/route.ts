import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Create a new support ticket (org admin)
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, organizationId: true, role: true, email: true, firstName: true, lastName: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'You must belong to an organization to submit tickets' },
        { status: 403 }
      )
    }

    // Get organization name
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    })

    const body = await request.json()
    const { subject, category, priority, message, eventId, issueUrl } = body

    if (!subject || !category || !message) {
      return NextResponse.json(
        { error: 'Subject, category, and message are required' },
        { status: 400 }
      )
    }

    // Validate eventId belongs to this organization if provided
    if (eventId) {
      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          organizationId: user.organizationId,
        },
      })
      if (!event) {
        return NextResponse.json(
          { error: 'Invalid event selected' },
          { status: 400 }
        )
      }
    }

    // Build the data object - only include optional fields if they have values
    // This ensures backwards compatibility if the migration hasn't been applied yet
    const ticketData: Record<string, unknown> = {
      organizationId: user.organizationId,
      submittedByUserId: user.id,
      ticketNumber: `TKT-${Date.now()}`,
      subject: subject.trim(),
      description: message.trim(),
      category,
      priority: priority || 'medium',
      status: 'open',
      messages: {
        create: {
          userId: user.id,
          message: message.trim(),
        },
      },
    }

    // Only add eventId and issueUrl if provided (for backwards compatibility)
    if (eventId) {
      ticketData.eventId = eventId
    }
    if (issueUrl) {
      ticketData.issueUrl = issueUrl
    }

    // Create ticket with initial message
    let ticket
    try {
      ticket = await prisma.supportTicket.create({
        data: ticketData as Parameters<typeof prisma.supportTicket.create>[0]['data'],
        include: {
          messages: true,
          organization: {
            select: { name: true },
          },
          event: {
            select: { id: true, name: true },
          },
        },
      })
    } catch (createError: unknown) {
      // If the error is about unknown fields (migration not applied), retry without them
      const errorMessage = createError instanceof Error ? createError.message : String(createError)
      if (errorMessage.includes('event_id') || errorMessage.includes('eventId') || errorMessage.includes('issue_url') || errorMessage.includes('issueUrl')) {
        console.warn('Event/issueUrl fields not in database yet, creating ticket without them')
        delete ticketData.eventId
        delete ticketData.issueUrl
        ticket = await prisma.supportTicket.create({
          data: ticketData as Parameters<typeof prisma.supportTicket.create>[0]['data'],
          include: {
            messages: true,
            organization: {
              select: { name: true },
            },
          },
        })
      } else {
        throw createError
      }
    }

    // Send confirmation email to the user
    if (user.email) {
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
              .ticket-box { background: white; border: 2px solid #9C8466; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .ticket-number { font-size: 24px; font-weight: bold; color: #1E3A5F; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Support Ticket Received</h1>
              </div>

              <div class="content">
                <p>Hi ${user.firstName || 'there'},</p>

                <p>We've received your support request and our team will review it shortly.</p>

                <div class="ticket-box">
                  <div style="color: #666; font-size: 12px; text-transform: uppercase;">Ticket Number</div>
                  <div class="ticket-number">${ticket.ticketNumber}</div>

                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
                    <strong>Subject:</strong> ${ticket.subject}
                  </div>
                  <div style="margin-top: 10px;">
                    <strong>Category:</strong> ${category}
                  </div>
                  <div style="margin-top: 10px;">
                    <strong>Priority:</strong> ${priority || 'Medium'}
                  </div>
                  ${'event' in ticket && ticket.event ? `
                  <div style="margin-top: 10px;">
                    <strong>Related Event:</strong> ${(ticket as { event?: { name: string } }).event?.name}
                  </div>
                  ` : ''}
                </div>

                <p>You can view and respond to this ticket from your organization dashboard under <strong>Settings → Support</strong>.</p>

                <p>We typically respond within 24 hours during business days.</p>

                <p>
                  Best regards,<br>
                  <strong>ChiRho Events Support Team</strong>
                </p>
              </div>

              <div class="footer">
                <p>ChiRho Events - Event Management for Faith Communities</p>
                <p>www.chirhoevents.com | support@chirhoevents.com</p>
              </div>
            </div>
          </body>
        </html>
      `

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'support@chirhoevents.com',
          to: user.email,
          subject: `Support Ticket ${ticket.ticketNumber} Received - ${subject}`,
          html: emailHtml,
        })
      } catch (emailError) {
        console.error('Failed to send ticket confirmation email:', emailError)
        // Don't fail the ticket creation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
      },
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

// List my organization's tickets (org admin)
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, organizationId: true },
    })

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    }

    if (status && status !== 'all') {
      where.status = status
    }

    // Try to fetch tickets with event relation, fall back without if migration not applied
    let tickets
    try {
      tickets = await prisma.supportTicket.findMany({
        where,
        include: {
          submittedByUser: {
            select: { firstName: true, lastName: true },
          },
          event: {
            select: { id: true, name: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    } catch (fetchError: unknown) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
      if (errorMessage.includes('event') || errorMessage.includes('event_id')) {
        console.warn('Event field not in database yet, fetching tickets without it')
        tickets = await prisma.supportTicket.findMany({
          where,
          include: {
            submittedByUser: {
              select: { firstName: true, lastName: true },
            },
            _count: {
              select: { messages: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })
      } else {
        throw fetchError
      }
    }

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('List tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
