import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  renderMasterAdminNotificationHtml,
  sendMasterAdminNotification,
} from '@/lib/master-admin-notify'
import { describeNeeds, needsEstimates, needsProblem, parseNeeds, suggestedTier } from '@/lib/onboarding-needs'

const ORG_TYPES = ['diocese', 'archdiocese', 'parish', 'seminary', 'ministry', 'retreat_center', 'school', 'other']
const HOW_HEARD = ['google_search', 'referral', 'social_media', 'conference_event', 'other']

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** POST /api/onboarding-requests: the public Get Started form */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const organizationName = text(body.organizationName, 255)
    const organizationType = ORG_TYPES.includes(body.organizationType) ? body.organizationType : ''
    const contactFirstName = text(body.contactFirstName, 255)
    const contactLastName = text(body.contactLastName, 255)
    const contactEmail = text(body.contactEmail, 255).toLowerCase()
    const contactPhone = text(body.contactPhone, 20)
    const billingAddress = text(body.billingAddress, 1000)
    const needs = parseNeeds(body.needs)

    const missing =
      !organizationName ? 'Enter your organization’s name.'
      : !organizationType ? 'Choose your organization type.'
      : !contactFirstName || !contactLastName ? 'Enter your first and last name.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? 'Enter a valid email address.'
      : !contactPhone ? 'Enter a phone number.'
      : needsProblem(needs)
    if (missing) return NextResponse.json({ error: missing }, { status: 400 })

    const requestedTier = suggestedTier(needs)
    const estimates = needsEstimates(needs)
    const howDidYouHear = HOW_HEARD.includes(body.howDidYouHear) ? body.howDidYouHear : null
    const billingCycle = body.billingCycle === 'annual' && needs.kind !== 'lux' ? 'annual' : 'monthly'
    const paymentMethod = body.paymentMethod === 'check' ? 'check' : 'credit_card'

    const onboardingRequest = await prisma.organizationOnboardingRequest.create({
      data: {
        organizationName,
        organizationType,
        contactFirstName,
        contactLastName,
        contactEmail,
        contactPhone,
        contactJobTitle: text(body.contactJobTitle, 255) || null,
        legalEntityName: text(body.legalEntityName, 255) || null,
        taxId: text(body.taxId, 50) || null,
        billingAddress: billingAddress || null,
        website: text(body.website, 255) || null,
        estimatedEventsPerYear: estimates.eventsPerYear,
        estimatedRegistrationsPerYear: estimates.registrationsPerYear,
        requestedTier,
        billingCyclePreference: billingCycle,
        paymentMethodPreference: paymentMethod,
        howDidYouHear,
        howDidYouHearOther: howDidYouHear === 'other' ? text(body.howDidYouHearOther, 255) || null : null,
        additionalNotes: text(body.additionalNotes, 5000) || null,
        needs: needs as object,
      },
    })

    await prisma.platformActivityLog.create({
      data: {
        activityType: 'onboarding_request',
        description: `New organization request from "${organizationName}" (${contactEmail})`,
        metadata: { requestId: onboardingRequest.id, organizationName, contactEmail, requestedTier, needs: needs.kind },
      },
    })

    // Everything they told us, so nothing has to be looked up in the dashboard
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chirhoevents.com'
    const dash = (v: string | null | undefined) => (v && v.trim()) || '—'
    await sendMasterAdminNotification({
      subject: `New organization request: ${organizationName}`,
      replyTo: contactEmail,
      html: renderMasterAdminNotificationHtml({
        title: 'New organization request',
        intro: `${organizationName} just applied to join ChiRho Events.`,
        rows: [
          { label: 'Organization', value: organizationName },
          { label: 'Type', value: organizationType },
          { label: 'Website', value: dash(onboardingRequest.website) },
          { label: 'Contact', value: `${contactFirstName} ${contactLastName} <${contactEmail}>` },
          { label: 'Phone', value: contactPhone },
          { label: 'Job title', value: dash(onboardingRequest.contactJobTitle) },
          ...describeNeeds(needs),
          { label: 'Suggested plan', value: requestedTier },
          { label: 'Billing cycle', value: billingCycle },
          { label: 'Pays by', value: paymentMethod === 'check' ? 'Check' : 'Credit card' },
          { label: 'Legal name', value: dash(onboardingRequest.legalEntityName) },
          { label: 'Tax ID / EIN', value: dash(onboardingRequest.taxId) },
          { label: 'Billing address', value: dash(billingAddress) },
          { label: 'How they heard', value: dash(howDidYouHear) + (onboardingRequest.howDidYouHearOther ? ` (${onboardingRequest.howDidYouHearOther})` : '') },
        ],
        bodyLabel: 'Anything else',
        bodyText: onboardingRequest.additionalNotes,
        ctaLabel: 'Review request',
        ctaUrl: `${appUrl}/dashboard/master-admin/pending-requests?request=${onboardingRequest.id}`,
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
