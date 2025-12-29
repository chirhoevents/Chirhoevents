import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getEmailHistory, logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

// GET email history for a registration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params
    const { userId } = await auth()
    console.log('[GET /emails] Request from user:', userId)

    if (!userId) {
      console.log('[GET /emails] Unauthorized - no userId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    console.log('[GET /emails] User found:', { id: user?.id, role: user?.role, orgId: user?.organizationId })

    if (!user || user.role !== 'org_admin') {
      console.log('[GET /emails] Forbidden - not org admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const registrationType = searchParams.get('type') as 'group' | 'individual' | null

    console.log('[GET /emails] Fetching emails for:', { registrationId, registrationType })

    if (!registrationType) {
      console.log('[GET /emails] Missing registration type')
      return NextResponse.json(
        { error: 'Registration type is required' },
        { status: 400 }
      )
    }

    // Verify registration belongs to user's organization
    let registration
    if (registrationType === 'group') {
      registration = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: { organizationId: true, groupName: true },
      })
    } else {
      registration = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        select: { organizationId: true, firstName: true, lastName: true },
      })
    }

    console.log('[GET /emails] Registration found:', !!registration)

    if (!registration) {
      console.log('[GET /emails] Registration not found')
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (registration.organizationId !== user.organizationId) {
      console.log('[GET /emails] Organization mismatch:', { regOrg: registration.organizationId, userOrg: user.organizationId })
      return NextResponse.json(
        { error: 'You do not have permission to access this registration' },
        { status: 403 }
      )
    }

    // Get email history
    const emailHistory = await getEmailHistory(registrationId, registrationType)
    console.log('[GET /emails] Email history retrieved:', { count: emailHistory.length })

    return NextResponse.json({ success: true, emails: emailHistory })
  } catch (error) {
    console.error('[GET /emails] Error fetching email history:', error)
    console.error('[GET /emails] Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('[GET /emails] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch email history' },
      { status: 500 }
    )
  }
}

// POST to resend an email or send from template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      emailId, // Optional: for resending from history
      subject, // Optional: for sending from template
      htmlContent, // Optional: for sending from template
      emailType, // Type of email being sent
      recipientEmail,
      recipientName,
      registrationType,
    } = body

    if (!registrationType || !recipientEmail) {
      return NextResponse.json(
        { error: 'Registration type and recipient email are required' },
        { status: 400 }
      )
    }

    // Must have either emailId (for resend) or subject+htmlContent (for template)
    if (!emailId && (!subject || !htmlContent)) {
      return NextResponse.json(
        { error: 'Must provide either emailId or subject and htmlContent' },
        { status: 400 }
      )
    }

    // Verify registration belongs to user's organization
    let registration
    let eventId: string
    if (registrationType === 'group') {
      const groupReg = await prisma.groupRegistration.findUnique({
        where: { id: registrationId },
        select: {
          organizationId: true,
          eventId: true,
          groupName: true,
          groupLeaderName: true,
          groupLeaderEmail: true,
        },
      })
      if (!groupReg) {
        return NextResponse.json(
          { error: 'Registration not found' },
          { status: 404 }
        )
      }
      registration = groupReg
      eventId = groupReg.eventId
    } else {
      const individualReg = await prisma.individualRegistration.findUnique({
        where: { id: registrationId },
        select: {
          organizationId: true,
          eventId: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      })
      if (!individualReg) {
        return NextResponse.json(
          { error: 'Registration not found' },
          { status: 404 }
        )
      }
      registration = individualReg
      eventId = individualReg.eventId
    }

    if (registration.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You do not have permission to access this registration' },
        { status: 403 }
      )
    }

    // Determine email content
    let subjectToSend: string
    let htmlToSend: string
    let emailTypeToLog: string

    if (emailId) {
      // Resending from history
      const emailToResend = await prisma.emailLog.findUnique({
        where: { id: emailId },
        select: {
          subject: true,
          htmlContent: true,
          emailType: true,
          metadata: true,
        },
      })

      if (!emailToResend) {
        return NextResponse.json(
          { error: 'Email not found' },
          { status: 404 }
        )
      }

      subjectToSend = emailToResend.subject
      htmlToSend = emailToResend.htmlContent
      emailTypeToLog = `${emailToResend.emailType}_resent`
    } else {
      // Sending from template
      subjectToSend = subject!
      htmlToSend = htmlContent!
      emailTypeToLog = emailType || 'template_email'
    }

    // Send the email
    const finalRecipientName = recipientName || (
      registrationType === 'group'
        ? (registration as any).groupLeaderName
        : `${(registration as any).firstName} ${(registration as any).lastName}`
    )

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
        to: recipientEmail,
        subject: subjectToSend,
        html: htmlToSend,
      })

      // Log the sent email
      await logEmail({
        organizationId: user.organizationId,
        eventId,
        registrationId,
        registrationType,
        recipientEmail,
        recipientName: finalRecipientName,
        emailType: emailTypeToLog,
        subject: subjectToSend,
        htmlContent: htmlToSend,
        metadata: emailId
          ? {
              originalEmailId: emailId,
              sentByUserId: user.id,
            }
          : {
              sentByUserId: user.id,
              sentFrom: 'template',
            },
      })

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)

      await logEmailFailure(
        {
          organizationId: user.organizationId,
          eventId,
          registrationId,
          registrationType,
          recipientEmail,
          recipientName: finalRecipientName,
          emailType: emailTypeToLog,
          subject: subjectToSend,
          htmlContent: htmlToSend,
        },
        emailError instanceof Error ? emailError.message : 'Unknown error'
      )

      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
