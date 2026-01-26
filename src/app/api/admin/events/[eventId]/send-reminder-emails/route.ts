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
      includeHousingInfo = false,
      housingInstructions = '',
      includeGroupAssignments = false,
      groupAssignmentInfo = '',
      customLinks = [] as { label: string; url: string }[],
      testMode = false,
      testEmail = '',
    } = body

    // Fetch registrations based on recipient type
    let groupRegistrations: any[] = []
    let individualRegistrations: any[] = []

    // If test mode, we'll send a single test email instead of fetching registrations
    if (testMode && testEmail) {
      // Build the email content using a sample/test context
      const eventDate = format(new Date(event.startDate), 'MMMM d, yyyy')
      const eventLocation = event.locationName || 'TBD'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'

      // Build additional info for test email
      let additionalInfo = ''
      if (includePortalReminder) {
        additionalInfo += 'Please check your registration portal to ensure all required forms are complete and payment is up to date.\n\n'
      }
      if (customMessage) {
        additionalInfo += customMessage + '\n\n'
      }
      if (arrivalInstructions) {
        additionalInfo += '**Arrival Information:**\n' + arrivalInstructions + '\n\n'
      }
      if (includeHousingInfo) {
        additionalInfo += '**Housing Information:**\n'
        additionalInfo += '[Housing type and assignment will be pulled from registration data]\n'
        if (housingInstructions) {
          additionalInfo += housingInstructions + '\n'
        }
        additionalInfo += '\n'
      }
      if (includeGroupAssignments) {
        additionalInfo += '**Group/Staff Assignments:**\n'
        additionalInfo += '[Assignment details will be pulled from registration data]\n'
        if (groupAssignmentInfo) {
          additionalInfo += groupAssignmentInfo + '\n'
        }
        additionalInfo += '\n'
      }

      // Add custom links
      const linksHtml = customLinks.length > 0
        ? customLinks.map((link: { label: string; url: string }) =>
            `<a href="${link.url}" style="color: #9C8466; text-decoration: underline;">${link.label}</a>`
          ).join(' | ')
        : ''

      const emailHtml = generateEventReminderEmail({
        participantName: 'Test Recipient',
        eventName: event.name,
        eventDate,
        eventLocation,
        accessCode: 'TEST-ACCESS-CODE',
        organizationName: event.organization.name,
        additionalInfo: additionalInfo + (linksHtml ? `\n\n**Quick Links:**\n${linksHtml}` : ''),
      })

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com',
          to: testEmail,
          subject: `[TEST] Event Reminder: ${event.name}`,
          html: emailHtml,
        })

        return NextResponse.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
          results: { sent: 1, failed: 0 },
        })
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

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
          housingType: true,
          onCampusYouth: true,
          onCampusChaperones: true,
          offCampusYouth: true,
          offCampusChaperones: true,
          smallGroupRoom: includeGroupAssignments ? {
            select: {
              roomNumber: true,
              building: {
                select: {
                  name: true,
                }
              },
            }
          } : false,
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
          housingType: true,
          roomType: true,
          preferredRoommate: true,
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

    // Build base additional info (will be customized per recipient for housing/assignments)
    const buildAdditionalInfo = (registration: any, isGroup: boolean) => {
      let info = ''
      if (includePortalReminder) {
        info += 'Please check your registration portal to ensure all required forms are complete and payment is up to date.\n\n'
      }
      if (customMessage) {
        info += customMessage + '\n\n'
      }
      if (arrivalInstructions) {
        info += '**Arrival Information:**\n' + arrivalInstructions + '\n\n'
      }

      // Include housing info if enabled
      if (includeHousingInfo) {
        const housingType = registration.housingType
        info += '**Housing Information:**\n'
        if (housingType) {
          const housingLabels: Record<string, string> = {
            on_campus: 'On Campus',
            off_campus: 'Off Campus',
            day_pass: 'Day Pass',
            single: 'Single Room',
            double: 'Double Room',
            triple: 'Triple Room',
            quad: 'Quad Room',
          }
          info += `Housing Type: ${housingLabels[housingType] || housingType}\n`
        }

        // For groups, show breakdown if available
        if (isGroup) {
          const onCampus = (registration.onCampusYouth || 0) + (registration.onCampusChaperones || 0)
          const offCampus = (registration.offCampusYouth || 0) + (registration.offCampusChaperones || 0)
          if (onCampus > 0) info += `On Campus: ${onCampus} participant(s)\n`
          if (offCampus > 0) info += `Off Campus: ${offCampus} participant(s)\n`
        }

        // For individuals, show room type
        if (!isGroup && registration.roomType) {
          const roomLabels: Record<string, string> = {
            single: 'Single Room',
            double: 'Double Room',
            triple: 'Triple Room',
            quad: 'Quad Room',
          }
          info += `Room Type: ${roomLabels[registration.roomType] || registration.roomType}\n`
        }

        if (housingInstructions) {
          info += housingInstructions + '\n'
        }
        info += '\n'
      }

      // Include group/staff assignments if enabled
      if (includeGroupAssignments) {
        info += '**Group/Staff Assignments:**\n'
        // For groups, show small group room if assigned
        if (isGroup && registration.smallGroupRoom) {
          const room = registration.smallGroupRoom
          const buildingName = room.building?.name || ''
          info += `Small Group Room: ${buildingName ? `${buildingName} - ` : ''}Room ${room.roomNumber}\n`
        }
        if (groupAssignmentInfo) {
          info += groupAssignmentInfo + '\n'
        }
        info += '\n'
      }

      // Add custom links
      if (customLinks.length > 0) {
        const linksHtml = customLinks
          .filter((link: { label: string; url: string }) => link.label && link.url)
          .map((link: { label: string; url: string }) =>
            `<a href="${link.url}" style="color: #9C8466; text-decoration: underline;">${link.label}</a>`
          ).join(' | ')
        if (linksHtml) {
          info += '**Quick Links:**\n' + linksHtml + '\n'
        }
      }

      return info.trim() || undefined
    }

    // Send to group leaders
    for (const group of groupRegistrations) {
      try {
        const groupAdditionalInfo = buildAdditionalInfo(group, true)
        const emailHtml = generateEventReminderEmail({
          participantName: group.groupLeaderName,
          eventName: event.name,
          eventDate,
          eventLocation,
          accessCode: group.accessCode,
          organizationName: event.organization.name,
          additionalInfo: groupAdditionalInfo,
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
        const individualAdditionalInfo = buildAdditionalInfo(individual, false)
        const emailHtml = generateEventReminderEmail({
          participantName: `${individual.firstName} ${individual.lastName}`,
          eventName: event.name,
          eventDate,
          eventLocation,
          accessCode: individual.confirmationCode,
          organizationName: event.organization.name,
          additionalInfo: individualAdditionalInfo,
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
