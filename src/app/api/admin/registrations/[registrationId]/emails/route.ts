import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getEmailHistory, logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface RouteParams {
  params: {
    registrationId: string
  }
}

// GET email history for a registration
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
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

    const { registrationId } = params
    const { searchParams } = new URL(request.url)
    const registrationType = searchParams.get('type') as 'group' | 'individual' | null

    if (!registrationType) {
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

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (registration.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You do not have permission to access this registration' },
        { status: 403 }
      )
    }

    // Get email history
    const emailHistory = await getEmailHistory(registrationId, registrationType)

    return NextResponse.json({ success: true, emails: emailHistory })
  } catch (error) {
    console.error('Error fetching email history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email history' },
      { status: 500 }
    )
  }
}

// POST to resend an email
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
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

    const { registrationId } = params
    const body = await request.json()
    const {
      emailId,
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

    // Get the email to resend
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
        subject: emailToResend.subject,
        html: emailToResend.htmlContent,
      })

      // Log the resent email
      await logEmail({
        organizationId: user.organizationId,
        eventId,
        registrationId,
        registrationType,
        recipientEmail,
        recipientName: finalRecipientName,
        emailType: `${emailToResend.emailType}_resent`,
        subject: emailToResend.subject,
        htmlContent: emailToResend.htmlContent,
        metadata: {
          ...(emailToResend.metadata as Record<string, any>),
          originalEmailId: emailId,
          resentByUserId: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Email resent successfully',
      })
    } catch (emailError) {
      console.error('Error resending email:', emailError)

      await logEmailFailure(
        {
          organizationId: user.organizationId,
          eventId,
          registrationId,
          registrationType,
          recipientEmail,
          recipientName: finalRecipientName,
          emailType: `${emailToResend.emailType}_resent`,
          subject: emailToResend.subject,
          htmlContent: emailToResend.htmlContent,
        },
        emailError instanceof Error ? emailError.message : 'Unknown error'
      )

      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error resending email:', error)
    return NextResponse.json(
      { error: 'Failed to resend email' },
      { status: 500 }
    )
  }
}
