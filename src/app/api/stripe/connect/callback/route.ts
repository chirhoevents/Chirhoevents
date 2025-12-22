import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const success = searchParams.get('success')

  // Redirect URL base
  const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/settings?tab=integrations`

  if (success !== 'true') {
    return NextResponse.redirect(`${baseUrl}&stripe_error=true`)
  }

  try {
    // Get the current user to find their organization
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.redirect(`${baseUrl}&stripe_error=auth_required`)
    }

    // Get organization with Stripe account
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeAccountId: true }
    })

    if (!org?.stripeAccountId) {
      return NextResponse.redirect(`${baseUrl}&stripe_error=no_account`)
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(org.stripeAccountId)

    // Update organization with Stripe account status
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        stripeChargesEnabled: account.charges_enabled || false,
        stripePayoutsEnabled: account.payouts_enabled || false,
        stripeOnboardingCompleted: account.details_submitted || false,
        stripeAccountStatus: account.charges_enabled
          ? 'active'
          : account.details_submitted
          ? 'restricted'
          : 'pending'
      }
    })

    // Redirect to settings page with success message
    return NextResponse.redirect(`${baseUrl}&stripe_connected=true`)

  } catch (error) {
    console.error('Stripe Connect callback error:', error)
    return NextResponse.redirect(`${baseUrl}&stripe_error=true`)
  }
}
