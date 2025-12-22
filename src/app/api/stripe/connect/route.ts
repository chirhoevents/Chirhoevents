import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization already has a Stripe account
    if (organization.stripeAccountId) {
      // Check if account is valid and get account link for onboarding completion
      try {
        const account = await stripe.accounts.retrieve(organization.stripeAccountId)

        if (!account.details_submitted) {
          // Account exists but onboarding not complete, create new onboarding link
          const accountLink = await stripe.accountLinks.create({
            account: organization.stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/settings?tab=integrations&stripe_refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback?success=true`,
            type: 'account_onboarding',
          })

          return NextResponse.json({ url: accountLink.url })
        }

        // Account is already fully connected
        return NextResponse.json({
          error: 'Stripe account already connected',
          connected: true,
        })
      } catch (stripeError) {
        // Account invalid, create a new one
        console.error('Invalid Stripe account, creating new one:', stripeError)
      }
    }

    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      email: organization.contactEmail || user.email,
      business_profile: {
        name: organization.name,
      },
      metadata: {
        organizationId: organization.id,
      },
    })

    // Save the Stripe account ID to the organization
    await prisma.organization.update({
      where: { id: organization.id },
      data: { stripeAccountId: account.id },
    })

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/settings?tab=integrations&stripe_refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Stripe connection' },
      { status: 500 }
    )
  }
}
