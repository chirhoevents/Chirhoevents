import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any, request)

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        stripeAccountId: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check Stripe connection status
    let stripeConnection = {
      connected: false,
      accountId: null as string | null,
      accountName: null as string | null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      mode: 'test' as 'test' | 'live',
    }

    if (organization.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(
          organization.stripeAccountId
        )

        stripeConnection = {
          connected: true,
          accountId: organization.stripeAccountId,
          accountName: account.business_profile?.name || account.email || null,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
            ? 'live'
            : 'test',
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe account:', stripeError)
        // Account might have been deleted or is invalid
        stripeConnection.connected = false
      }
    }

    // Payment stats if connected
    let paymentStats = {
      totalVolume: 0,
      totalPayments: 0,
      lastPaymentDate: null as string | null,
    }

    if (stripeConnection.connected) {
      const payments = await prisma.payment.aggregate({
        where: {
          organizationId,
          paymentStatus: 'succeeded',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      })

      const lastPayment = await prisma.payment.findFirst({
        where: {
          organizationId,
          paymentStatus: 'succeeded',
        },
        orderBy: {
          processedAt: 'desc',
        },
        select: {
          processedAt: true,
        },
      })

      paymentStats = {
        totalVolume: Number(payments._sum.amount || 0),
        totalPayments: payments._count,
        lastPaymentDate: lastPayment?.processedAt?.toISOString() || null,
      }
    }

    return NextResponse.json({
      integrations: {
        stripe: {
          ...stripeConnection,
          stats: paymentStats,
        },
        googleSheets: {
          connected: false,
          comingSoon: true,
        },
        mailchimp: {
          connected: false,
          comingSoon: true,
        },
        quickbooks: {
          connected: false,
          comingSoon: true,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
