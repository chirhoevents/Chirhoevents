import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    // TODO: Send notification email to Master Admin

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
