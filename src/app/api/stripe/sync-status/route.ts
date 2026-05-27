import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(clerkUserId || undefined)

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const organizationId = await getEffectiveOrgId(user)

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { stripeAccountId: true },
    })

    if (!org?.stripeAccountId) {
      return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
    }

    const account = await stripe.accounts.retrieve(org.stripeAccountId)

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeOnboardingCompleted: account.details_submitted,
        stripeAccountStatus: account.charges_enabled
          ? 'active'
          : account.details_submitted
          ? 'restricted'
          : 'pending',
      },
    })

    return NextResponse.json({
      chargesEnabled: updated.stripeChargesEnabled,
      payoutsEnabled: updated.stripePayoutsEnabled,
      detailsSubmitted: updated.stripeOnboardingCompleted,
      accountStatus: updated.stripeAccountStatus,
    })
  } catch (error) {
    console.error('Stripe sync-status error:', error)
    return NextResponse.json({ error: 'Failed to sync Stripe status' }, { status: 500 })
  }
}
