import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface BulkEmailRequest {
  templateId: string
  subject: string
  htmlContent: string
  recipientType: 'all_group_leaders' | 'selected'
  selectedRecipients?: string[] // registration IDs for selected recipients
}

interface GroupRegistrationWithEvent {
  id: string
  groupLeaderName: string
  groupLeaderEmail: string
  groupName: string
  eventId: string
  event: {
    id: string
    name: string
    status: string
  }
}

interface IndividualRegistrationWithEvent {
  id: string
  firstName: string
  lastName: string
  email: string
  eventId: string
  event: {
    id: string
    name: string
    status: string
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    // Get all group leaders across all events for this organization
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { organizationId: organizationId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [
        { event: { startDate: 'desc' } },
        { groupName: 'asc' },
      ],
    })

    // Also get individual registrations
    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: { organizationId: organizationId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [
        { event: { startDate: 'desc' } },
        { lastName: 'asc' },
      ],
    })

    const recipients = [
      ...groupRegistrations.map((reg: GroupRegistrationWithEvent) => ({
        id: reg.id,
        type: 'group' as const,
        name: reg.groupLeaderName,
        email: reg.groupLeaderEmail,
        groupName: reg.groupName,
        eventId: reg.eventId,
        eventName: reg.event.name,
        eventStatus: reg.event.status,
      })),
      ...individualRegistrations.map((reg: IndividualRegistrationWithEvent) => ({
        id: reg.id,
        type: 'individual' as const,
        name: `${reg.firstName} ${reg.lastName}`,
        email: reg.email,
        groupName: null,
        eventId: reg.eventId,
        eventName: reg.event.name,
        eventStatus: reg.event.status,
      })),
    ]

    // Count unique group leaders
    const uniqueGroupLeaders = new Set(
      groupRegistrations.map((r: GroupRegistrationWithEvent) => r.groupLeaderEmail.toLowerCase())
    ).size

    return NextResponse.json({
      recipients,
      summary: {
        totalGroupLeaders: uniqueGroupLeaders,
        totalIndividuals: individualRegistrations.length,
        totalRecipients: recipients.length,
      },
    })
  } catch (error) {
    console.error('Error fetching recipients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const body: BulkEmailRequest = await request.json()
    const { templateId, subject, htmlContent, recipientType, selectedRecipients } = body

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Subject and HTML content are required' },
        { status: 400 }
      )
    }

    // Get recipients based on type
    let groupRegistrations: any[] = []

    if (recipientType === 'all_group_leaders') {
      groupRegistrations = await prisma.groupRegistration.findMany({
        where: { organizationId: organizationId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    } else if (selectedRecipients && selectedRecipients.length > 0) {
      groupRegistrations = await prisma.groupRegistration.findMany({
        where: {
          organizationId: organizationId,
          id: { in: selectedRecipients },
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    }

    if (groupRegistrations.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Track unique emails to avoid duplicates
    const sentEmails = new Set<string>()
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Send emails
    for (const registration of groupRegistrations) {
      const email = registration.groupLeaderEmail.toLowerCase()

      // Skip if already sent to this email
      if (sentEmails.has(email)) {
        results.skipped++
        continue
      }

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: registration.groupLeaderEmail,
          subject: subject,
          html: htmlContent,
        })

        // Log successful email
        await logEmail({
          organizationId: organizationId,
          eventId: registration.eventId,
          registrationId: registration.id,
          registrationType: 'group',
          recipientEmail: registration.groupLeaderEmail,
          recipientName: registration.groupLeaderName,
          emailType: templateId || 'bulk_email',
          subject: subject,
          htmlContent: htmlContent,
          metadata: {
            sentByUserId: user.id,
            bulkSend: true,
          },
        })

        sentEmails.add(email)
        results.sent++
      } catch (error) {
        console.error(
          `Failed to send to ${registration.groupLeaderEmail}:`,
          error
        )

        // Log failed email
        await logEmailFailure(
          {
            organizationId: organizationId,
            eventId: registration.eventId,
            registrationId: registration.id,
            registrationType: 'group',
            recipientEmail: registration.groupLeaderEmail,
            recipientName: registration.groupLeaderName,
            emailType: templateId || 'bulk_email',
            subject: subject,
            htmlContent: htmlContent,
          },
          error instanceof Error ? error.message : 'Unknown error'
        )

        results.failed++
        results.errors.push(
          `Failed to send to ${registration.groupLeaderName} (${registration.groupLeaderEmail})`
        )
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        sent: results.sent,
        failed: results.failed,
        skipped: results.skipped,
        total: groupRegistrations.length,
      },
      errors: results.errors.slice(0, 10), // Limit error list
    })
  } catch (error) {
    console.error('Error sending bulk emails:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk emails' },
      { status: 500 }
    )
  }
}
