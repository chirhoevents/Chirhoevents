import { NextResponse } from 'next/server'
import { getCurrentUser, isFullAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    // Only org_admin or master_admin can disconnect Stripe
    if (!user || !isFullAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only organization admins can disconnect Stripe' },
        { status: 403 }
      )
    }

    const organizationId = await getEffectiveOrgId(user as any)

    const body = await request.json()
    const { newContactEmail } = body

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Clear Stripe connection and optionally update contact email
    const updateData: {
      stripeAccountId: null
      stripeAccountStatus: 'not_connected'
      stripeOnboardingCompleted: false
      stripeChargesEnabled: false
      stripePayoutsEnabled: false
      stripeConnectedAt: null
      contactEmail?: string
    } = {
      stripeAccountId: null,
      stripeAccountStatus: 'not_connected',
      stripeOnboardingCompleted: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeConnectedAt: null,
    }

    if (newContactEmail) {
      updateData.contactEmail = newContactEmail
    }

    await prisma.organization.update({
      where: { id: organization.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Stripe disconnected successfully. You can now reconnect with a new account.',
    })
  } catch (error) {
    console.error('Error disconnecting Stripe:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Stripe' },
      { status: 500 }
    )
  }
}
