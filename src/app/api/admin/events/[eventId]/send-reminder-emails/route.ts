import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { Resend } from 'resend'
import { logEmail, logEmailFailure } from '@/lib/email-logger'
import {
  generateEventReminderEmail,
  generateSurveyFeedbackEmail,
  generateRegistrationOpenEmail,
  generateGeneralUpdateEmail,
  generatePaymentReminderEmail,
  generateLateFeeNoticeEmail,
  generateThankYouEmail,
} from '@/lib/email-templates'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateType =
  | 'event_reminder'
  | 'survey_feedback'
  | 'registration_open'
  | 'general_update'
  | 'payment_reminder'
  | 'late_fee_notice'
  | 'thank_you'

interface CustomLink {
  label: string
  url: string
}

// ─── Email subject builders ───────────────────────────────────────────────────

function buildSubject(templateType: TemplateType, eventName: string, body?: any): string {
  switch (templateType) {
    case 'event_reminder':
      return `Event Reminder: ${eventName}`
    case 'survey_feedback':
      return `We'd love your feedback on ${eventName}`
    case 'registration_open':
      return `Registration is now open for ${eventName}`
    case 'general_update':
      return body?.emailSubject || `Update: ${eventName}`
    case 'payment_reminder':
      return `Payment Reminder: ${eventName}`
    case 'late_fee_notice':
      return `Late Fee Notice: ${eventName}`
    case 'thank_you':
      return `Thank you for being part of ${eventName}`
    default:
      return eventName
  }
}

// ─── Email HTML builders ──────────────────────────────────────────────────────

function buildGroupEmailHtml(
  templateType: TemplateType,
  group: any,
  event: any,
  body: any,
  orgName: string,
  supportEmail: string,
): string {
  const links: CustomLink[] = (body.links ?? []).filter(
    (l: CustomLink) => l.label && l.url,
  )

  switch (templateType) {
    case 'event_reminder': {
      const eventDate = event.startDate
        ? format(new Date(event.startDate), 'MMMM d, yyyy')
        : undefined
      const eventLocation = event.locationName || undefined

      // Build housing info string
      let housingInfo: string | undefined
      if (body.includeHousingInfo) {
        const parts: string[] = []
        if (group.housingType) {
          const labels: Record<string, string> = {
            on_campus: 'On Campus',
            off_campus: 'Off Campus',
            day_pass: 'Day Pass',
          }
          parts.push(`Housing Type: ${labels[group.housingType] || group.housingType}`)
        }
        const onCampus = (group.onCampusYouth || 0) + (group.onCampusChaperones || 0)
        const offCampus = (group.offCampusYouth || 0) + (group.offCampusChaperones || 0)
        if (onCampus > 0) parts.push(`On Campus: ${onCampus} participant(s)`)
        if (offCampus > 0) parts.push(`Off Campus: ${offCampus} participant(s)`)
        if (body.housingInstructions) parts.push(body.housingInstructions)
        housingInfo = parts.join('\n') || undefined
      }

      // Build small group room string
      let smallGroupRoom: string | undefined
      if (body.includeGroupAssignments && group.smallGroupRoom) {
        const room = group.smallGroupRoom
        const building = room.building?.name ? `${room.building.name} — ` : ''
        smallGroupRoom = `Meeting Room: ${building}Room ${room.roomNumber}`
        if (body.groupAssignmentInfo) smallGroupRoom += `\n${body.groupAssignmentInfo}`
      }

      // Build staff contacts string
      let staffContacts: string | undefined
      if (body.includeStaffAssignments && group.groupStaffAssignments?.length > 0) {
        const typeLabels: Record<string, string> = {
          sgl: 'Small Group Leader',
          co_sgl: 'Co-Small Group Leader',
          seminarian: 'Seminarian',
          priest: 'Priest',
          deacon: 'Deacon',
          religious: 'Religious',
          counselor: 'Counselor',
          volunteer: 'Volunteer',
        }
        staffContacts = group.groupStaffAssignments
          .map((a: any) => {
            const name = `${a.staff.firstName} ${a.staff.lastName}`
            const role = typeLabels[a.staff.staffType] || a.staff.staffType
            return a.staff.email ? `${role}: ${name} (${a.staff.email})` : `${role}: ${name}`
          })
          .join('\n')
      }

      // Build payment summary string
      let paymentSummary: string | undefined
      if (body.includePaymentInfo) {
        const total = group.totalCost ?? 0
        const paid = group.totalPaid ?? 0
        const balance = group.balance ?? 0
        const parts = [
          `Total: $${total.toFixed(2)}`,
          `Paid: $${paid.toFixed(2)}`,
        ]
        if (body.showBalanceDue) {
          parts.push(
            balance > 0
              ? `Balance Due: $${balance.toFixed(2)}`
              : 'Paid in Full ✓',
          )
        }
        paymentSummary = parts.join('\n')
      }

      return generateEventReminderEmail({
        participantName: group.groupLeaderName,
        eventName: event.name,
        eventDate,
        eventLocation,
        accessCode: group.accessCode,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: true,
        customMessage: body.customMessage || undefined,
        arrivalInstructions: body.arrivalInstructions || undefined,
        includePortalReminder: body.includePortalReminder ?? true,
        housingInfo,
        smallGroupRoom,
        staffContacts,
        paymentSummary,
        links,
      })
    }

    case 'survey_feedback':
      return generateSurveyFeedbackEmail({
        recipientName: group.groupLeaderName,
        eventName: event.name,
        surveyUrl: body.surveyUrl,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: true,
        links,
      })

    case 'registration_open':
      return generateRegistrationOpenEmail({
        recipientName: group.groupLeaderName,
        eventName: event.name,
        registrationUrl: body.registrationUrl,
        eventDate: body.eventDate || undefined,
        eventLocation: body.eventLocation || undefined,
        registrationDeadline: body.registrationDeadline || undefined,
        price: body.price || undefined,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        links,
      })

    case 'general_update':
      return generateGeneralUpdateEmail({
        recipientName: group.groupLeaderName,
        eventName: event.name,
        messageBody: body.messageBody,
        organizationName: orgName,
        supportEmail,
        links,
      })

    case 'payment_reminder':
      return generatePaymentReminderEmail({
        recipientName: group.groupLeaderName,
        eventName: event.name,
        balanceDue: body.balanceDue,
        paymentDeadline: body.paymentDeadline || undefined,
        totalAmount: body.totalAmount || undefined,
        amountPaid: body.amountPaid || undefined,
        paymentUrl: body.paymentUrl || undefined,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: true,
        links,
      })

    case 'late_fee_notice':
      return generateLateFeeNoticeEmail({
        recipientName: group.groupLeaderName,
        eventName: event.name,
        originalAmount: body.originalAmount,
        lateFeeAmount: body.lateFeeAmount,
        newTotal: body.newTotal,
        lateFeeEffectiveDate: body.lateFeeEffectiveDate || undefined,
        paymentUrl: body.paymentUrl || undefined,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: true,
        links,
      })

    case 'thank_you':
      return generateThankYouEmail({
        recipientName: group.groupLeaderName,
        eventName: event.name,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: true,
        links,
      })

    default:
      return ''
  }
}

function buildIndividualEmailHtml(
  templateType: TemplateType,
  individual: any,
  event: any,
  body: any,
  orgName: string,
  supportEmail: string,
): string {
  const recipientName = `${individual.firstName} ${individual.lastName}`
  const links: CustomLink[] = (body.links ?? []).filter(
    (l: CustomLink) => l.label && l.url,
  )

  switch (templateType) {
    case 'event_reminder': {
      const eventDate = event.startDate
        ? format(new Date(event.startDate), 'MMMM d, yyyy')
        : undefined
      const eventLocation = event.locationName || undefined

      let housingInfo: string | undefined
      if (body.includeHousingInfo && individual.housingType) {
        const labels: Record<string, string> = {
          on_campus: 'On Campus',
          off_campus: 'Off Campus',
          day_pass: 'Day Pass',
          single: 'Single Room',
          double: 'Double Room',
          triple: 'Triple Room',
          quad: 'Quad Room',
        }
        const parts = [`Housing: ${labels[individual.housingType] || individual.housingType}`]
        if (individual.roomType) {
          parts.push(`Room Type: ${labels[individual.roomType] || individual.roomType}`)
        }
        if (body.housingInstructions) parts.push(body.housingInstructions)
        housingInfo = parts.join('\n')
      }

      return generateEventReminderEmail({
        participantName: recipientName,
        eventName: event.name,
        eventDate,
        eventLocation,
        // Individual registrations may or may not have a confirmation code
        accessCode: individual.confirmationCode || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: false,
        customMessage: body.customMessage || undefined,
        arrivalInstructions: body.arrivalInstructions || undefined,
        includePortalReminder: body.includePortalReminder ?? true,
        housingInfo,
        links,
      })
    }

    case 'survey_feedback':
      return generateSurveyFeedbackEmail({
        recipientName,
        eventName: event.name,
        surveyUrl: body.surveyUrl,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: false,
        links,
      })

    case 'registration_open':
      return generateRegistrationOpenEmail({
        recipientName,
        eventName: event.name,
        registrationUrl: body.registrationUrl,
        eventDate: body.eventDate || undefined,
        eventLocation: body.eventLocation || undefined,
        registrationDeadline: body.registrationDeadline || undefined,
        price: body.price || undefined,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        links,
      })

    case 'general_update':
      return generateGeneralUpdateEmail({
        recipientName,
        eventName: event.name,
        messageBody: body.messageBody,
        organizationName: orgName,
        supportEmail,
        links,
      })

    case 'payment_reminder':
      return generatePaymentReminderEmail({
        recipientName,
        eventName: event.name,
        balanceDue: body.balanceDue,
        paymentDeadline: body.paymentDeadline || undefined,
        totalAmount: body.totalAmount || undefined,
        amountPaid: body.amountPaid || undefined,
        paymentUrl: body.paymentUrl || undefined,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: false,
        links,
      })

    case 'late_fee_notice':
      return generateLateFeeNoticeEmail({
        recipientName,
        eventName: event.name,
        originalAmount: body.originalAmount,
        lateFeeAmount: body.lateFeeAmount,
        newTotal: body.newTotal,
        lateFeeEffectiveDate: body.lateFeeEffectiveDate || undefined,
        paymentUrl: body.paymentUrl || undefined,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: false,
        links,
      })

    case 'thank_you':
      return generateThankYouEmail({
        recipientName,
        eventName: event.name,
        customMessage: body.customMessage || undefined,
        organizationName: orgName,
        supportEmail,
        isGroupRegistration: false,
        links,
      })

    default:
      return ''
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params

    // Auth check
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 },
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    // Verify event belongs to organization
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId },
      include: {
        organization: {
          select: { id: true, name: true, contactEmail: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      templateType = 'event_reminder' as TemplateType,
      recipients = 'all', // 'all', 'groups', 'individuals'
      testMode = false,
      testEmail = '',
      // Event reminder specific
      includeGroupAssignments = false,
      includeStaffAssignments = false,
      includePaymentInfo = false,
    } = body

    const orgName = event.organization.name
    const supportEmail = event.organization.contactEmail || 'support@chirhoevents.com'
    const subject = buildSubject(templateType, event.name, body)

    // ── Test mode: send a single preview email ──────────────────────────────
    if (testMode && testEmail) {
      const testGroup = {
        groupLeaderName: 'Test Recipient',
        groupName: 'Test Group',
        accessCode: 'TEST-001',
        housingType: 'on_campus',
        onCampusYouth: 10,
        onCampusChaperones: 2,
        offCampusYouth: 0,
        offCampusChaperones: 0,
        totalCost: 500,
        totalPaid: 350,
        balance: 150,
        groupStaffAssignments: [],
        smallGroupRoom: null,
      }

      const emailHtml = buildGroupEmailHtml(
        templateType,
        testGroup,
        event,
        body,
        orgName,
        supportEmail,
      )

      try {
        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: 'support@chirhoevents.com',
          to: testEmail,
          subject: `[TEST] ${subject}`,
          html: emailHtml,
        })
        return NextResponse.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
          results: { sent: 1, failed: 0 },
        })
      } catch (error) {
        return NextResponse.json(
          {
            error: `Failed to send test email: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
          { status: 500 },
        )
      }
    }

    // ── Fetch registrations ─────────────────────────────────────────────────
    let groupRegistrations: any[] = []
    let individualRegistrations: any[] = []

    if (recipients === 'all' || recipients === 'groups') {
      groupRegistrations = await prisma.groupRegistration.findMany({
        where: {
          eventId,
          registrationStatus: { in: ['pending_forms', 'pending_payment', 'complete'] },
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
          smallGroupRoom: includeGroupAssignments
            ? { select: { roomNumber: true, building: { select: { name: true } } } }
            : false,
          groupStaffAssignments: includeStaffAssignments
            ? {
                select: {
                  role: true,
                  staff: {
                    select: {
                      firstName: true,
                      lastName: true,
                      staffType: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              }
            : false,
        },
      })

      // Attach payment balances for reminder and payment_reminder templates
      if (includePaymentInfo || templateType === 'payment_reminder') {
        for (const group of groupRegistrations) {
          const balance = await prisma.paymentBalance.findUnique({
            where: { registrationId: group.id },
            select: { totalAmountDue: true, amountPaid: true, amountRemaining: true },
          })
          group.totalCost = balance ? Number(balance.totalAmountDue) : 0
          group.totalPaid = balance ? Number(balance.amountPaid) : 0
          group.balance = balance ? Number(balance.amountRemaining) : 0
        }
      }
    }

    if (recipients === 'all' || recipients === 'individuals') {
      individualRegistrations = await prisma.individualRegistration.findMany({
        where: {
          eventId,
          registrationStatus: { in: ['pending_forms', 'pending_payment', 'complete'] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          confirmationCode: true,
          housingType: true,
          roomType: true,
        },
      })
    }

    // ── Send emails ─────────────────────────────────────────────────────────
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    // Group registrations
    for (const group of groupRegistrations) {
      try {
        const emailHtml = buildGroupEmailHtml(
          templateType,
          group,
          event,
          body,
          orgName,
          supportEmail,
        )
        if (!emailHtml) continue

        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: 'support@chirhoevents.com',
          to: group.groupLeaderEmail,
          subject,
          html: emailHtml,
        })

        await logEmail({
          organizationId,
          eventId,
          registrationId: group.id,
          registrationType: 'group',
          recipientEmail: group.groupLeaderEmail,
          recipientName: group.groupLeaderName,
          emailType: templateType,
          subject,
          htmlContent: emailHtml,
          metadata: { groupName: group.groupName, totalParticipants: group.totalParticipants },
        })

        results.sent++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Failed to send to ${group.groupLeaderEmail}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        )
        await logEmailFailure(
          {
            organizationId,
            eventId,
            registrationId: group.id,
            registrationType: 'group',
            recipientEmail: group.groupLeaderEmail,
            recipientName: group.groupLeaderName,
            emailType: templateType,
            subject,
            htmlContent: '',
          },
          error instanceof Error ? error.message : 'Unknown error',
        )
      }
    }

    // Individual registrations
    for (const individual of individualRegistrations) {
      try {
        const emailHtml = buildIndividualEmailHtml(
          templateType,
          individual,
          event,
          body,
          orgName,
          supportEmail,
        )
        if (!emailHtml) continue

        await resend.emails.send({
          from: `ChiRho Events <${process.env.RESEND_FROM_EMAIL || 'notifications@chirhoevents.com'}>`,
          reply_to: 'support@chirhoevents.com',
          to: individual.email,
          subject,
          html: emailHtml,
        })

        const recipientName = `${individual.firstName} ${individual.lastName}`
        await logEmail({
          organizationId,
          eventId,
          registrationId: individual.id,
          registrationType: 'individual',
          recipientEmail: individual.email,
          recipientName,
          emailType: templateType,
          subject,
          htmlContent: emailHtml,
        })

        results.sent++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Failed to send to ${individual.email}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        )
        await logEmailFailure(
          {
            organizationId,
            eventId,
            registrationId: individual.id,
            registrationType: 'individual',
            recipientEmail: individual.email,
            recipientName: `${individual.firstName} ${individual.lastName}`,
            emailType: templateType,
            subject,
            htmlContent: '',
          },
          error instanceof Error ? error.message : 'Unknown error',
        )
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Sent ${results.sent} email(s)${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
    })
  } catch (error) {
    console.error('Error sending emails:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}
