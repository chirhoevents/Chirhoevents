import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import { generateEventReminderEmail } from '@/lib/email-templates'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Auth check
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    // Verify event belongs to organization
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      recipients = 'all', // 'all', 'groups', 'individuals'
      customMessage = '',
      arrivalInstructions = '',
      includePortalReminder = true,
    } = body

    // Fetch registrations based on recipient type
    let groupRegistrations: any[] = []
    let individualRegistrations: any[] = []

    if (recipients === 'all' || recipients === 'groups') {
      groupRegistrations = await prisma.groupRegistration.findMany({
        where: {
          eventId,
          // Include all active registration statuses
          registrationStatus: {
            in: ['pending_forms', 'pending_payment', 'complete'],
          },
        },
        select: {
          id: true,
          groupName: true,
          groupLeaderName: true,
          groupLeaderEmail: true,
          accessCode: true,
          totalParticipants: true,
        },
      })
    }

    if (recipients === 'all' || recipients === 'individuals') {
      individualRegistrations = await prisma.individualRegistration.findMany({
        where: {
          eventId,
          // Include all active registration statuses
          registrationStatus: {
            in: ['pending_forms', 'pending_payment', 'complete'],
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          confirmationCode: true,
        },
      })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    const eventDate = format(new Date(event.startDate), 'MMMM d, yyyy')
    const eventLocation = event.locationName || 'TBD'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

    // Build additional info
    let additionalInfo = ''
    if (includePortalReminder) {
      additionalInfo += 'Please check your registration portal to ensure all required forms are complete and payment is up to date.\n\n'
    }
    if (customMessage) {
      additionalInfo += customMessage + '\n\n'
    }
    if (arrivalInstructions) {
      additionalInfo += '**Arrival Information:**\n' + arrivalInstructions
    }

    // Send to group leaders
    for (const group of groupRegistrations) {
      try {
        const emailHtml = generateEventReminderEmail({
          participantName: group.groupLeaderName,
          eventName: event.name,
          eventDate,
          eventLocation,
          accessCode: group.accessCode,
          organizationName: event.organization.name,
          additionalInfo: additionalInfo || undefined,
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: group.groupLeaderEmail,
          subject: `Event Reminder: ${event.name}`,
          html: emailHtml,
        })

        await logEmail({
          organizationId,
          eventId,
          registrationId: group.id,
          registrationType: 'group',
          recipientEmail: group.groupLeaderEmail,
          recipientName: group.groupLeaderName,
          emailType: 'event_reminder',
          subject: `Event Reminder: ${event.name}`,
          htmlContent: emailHtml,
          metadata: {
            groupName: group.groupName,
            totalParticipants: group.totalParticipants,
          },
        })

        results.sent++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to send to ${group.groupLeaderEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`)

        await logEmailFailure(
          {
            organizationId,
            eventId,
            registrationId: group.id,
            registrationType: 'group',
            recipientEmail: group.groupLeaderEmail,
            recipientName: group.groupLeaderName,
            emailType: 'event_reminder',
            subject: `Event Reminder: ${event.name}`,
            htmlContent: '',
          },
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }

    // Send to individual registrations
    for (const individual of individualRegistrations) {
      try {
        const emailHtml = generateEventReminderEmail({
          participantName: `${individual.firstName} ${individual.lastName}`,
          eventName: event.name,
          eventDate,
          eventLocation,
          accessCode: individual.confirmationCode,
          organizationName: event.organization.name,
          additionalInfo: additionalInfo || undefined,
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: individual.email,
          subject: `Event Reminder: ${event.name}`,
          html: emailHtml,
        })

        await logEmail({
          organizationId,
          eventId,
          registrationId: individual.id,
          registrationType: 'individual',
          recipientEmail: individual.email,
          recipientName: `${individual.firstName} ${individual.lastName}`,
          emailType: 'event_reminder',
          subject: `Event Reminder: ${event.name}`,
          htmlContent: emailHtml,
        })

        results.sent++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to send to ${individual.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)

        await logEmailFailure(
          {
            organizationId,
            eventId,
            registrationId: individual.id,
            registrationType: 'individual',
            recipientEmail: individual.email,
            recipientName: `${individual.firstName} ${individual.lastName}`,
            emailType: 'event_reminder',
            subject: `Event Reminder: ${event.name}`,
            htmlContent: '',
          },
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Sent ${results.sent} reminder emails${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
    })
  } catch (error) {
    console.error('Error sending reminder emails:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder emails' },
      { status: 500 }
    )
  }
}
