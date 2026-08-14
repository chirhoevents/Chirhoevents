import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  renderMasterAdminNotificationHtml,
  sendMasterAdminNotification,
} from '@/lib/master-admin-notify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      organizationName,
      organizationType,
      website,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      contactJobTitle,
      legalEntityName,
      taxId,
      billingAddress,
      eventsPerYear,
      attendeesPerYear,
      requestedTier,
      billingCycle,
      paymentMethod,
      howDidYouHear,
      howDidYouHearOther,
      additionalNotes,
    } = body

    // Map events per year to numeric estimate
    const eventsEstimate: Record<string, number> = {
      '1-3': 3,
      '4-5': 5,
      '6-10': 10,
      '11-25': 25,
      '25+': 50,
    }

    // Map attendees per year to numeric estimate
    const attendeesEstimate: Record<string, number> = {
      'under-500': 500,
      '500-1000': 1000,
      '1000-3000': 3000,
      '3000-8000': 8000,
      '8000+': 10000,
    }

    const onboardingRequest = await prisma.organizationOnboardingRequest.create({
      data: {
        organizationName,
        organizationType,
        contactFirstName,
        contactLastName,
        contactEmail,
        contactPhone,
        contactJobTitle,
        legalEntityName,
        taxId,
        billingAddress,
        website,
        estimatedEventsPerYear: eventsEstimate[eventsPerYear] || null,
        estimatedRegistrationsPerYear: attendeesEstimate[attendeesPerYear] || null,
        requestedTier,
        billingCyclePreference: billingCycle,
        paymentMethodPreference: paymentMethod,
        howDidYouHear: howDidYouHear || null,
        howDidYouHearOther: howDidYouHear === 'other' ? howDidYouHearOther : null,
        additionalNotes,
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        activityType: 'onboarding_request',
        description: `New organization request from "${organizationName}" (${contactEmail})`,
        metadata: {
          requestId: onboardingRequest.id,
          organizationName,
          contactEmail,
          requestedTier,
        },
      },
    })

    // TODO: Send confirmation email to applicant

    // Notify master-admin recipients so join-the-app requests don't sit
    // unread until someone remembers to open the dashboard.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const contactName = `${contactFirstName ?? ''} ${contactLastName ?? ''}`.trim() || 'Unknown'
    await sendMasterAdminNotification({
      subject: `New organization request: ${organizationName}`,
      replyTo: contactEmail || undefined,
      html: renderMasterAdminNotificationHtml({
        title: 'New organization request',
        intro: `${organizationName} just applied to join ChiRho Events.`,
        rows: [
          { label: 'Organization', value: String(organizationName ?? '—') },
          { label: 'Type', value: String(organizationType ?? '—') },
          { label: 'Website', value: String(website ?? '—') },
          { label: 'Contact', value: `${contactName}${contactEmail ? ` <${contactEmail}>` : ''}` },
          { label: 'Phone', value: String(contactPhone ?? '—') },
          { label: 'Job title', value: String(contactJobTitle ?? '—') },
          { label: 'Requested tier', value: String(requestedTier ?? '—') },
          { label: 'Billing cycle', value: String(billingCycle ?? '—') },
          { label: 'Payment method', value: String(paymentMethod ?? '—') },
          { label: 'Events per year', value: String(eventsPerYear ?? '—') },
          { label: 'Attendees per year', value: String(attendeesPerYear ?? '—') },
          { label: 'How they heard', value: String(howDidYouHear ?? '—') + (howDidYouHear === 'other' && howDidYouHearOther ? ` (${howDidYouHearOther})` : '') },
        ],
        bodyLabel: 'Additional notes',
        bodyText: additionalNotes || null,
        ctaLabel: 'Review request',
        ctaUrl: `${appUrl}/dashboard/master-admin/onboarding-requests/${onboardingRequest.id}`,
      }),
    })

    return NextResponse.json({
      success: true,
      requestId: onboardingRequest.id,
      message: 'Application submitted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Onboarding request error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
