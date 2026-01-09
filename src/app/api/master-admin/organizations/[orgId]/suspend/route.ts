import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify master admin
    const masterAdmin = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!masterAdmin || masterAdmin.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orgId } = await params

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        status: 'suspended',
        subscriptionStatus: 'suspended',
      },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: masterAdmin.id,
        activityType: 'org_suspended',
        description: `Organization "${organization.name}" suspended by Master Admin`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${organization.name} has been suspended`,
    })
  } catch (error) {
    console.error('Suspend organization error:', error)
    return NextResponse.json(
      { error: 'Failed to suspend organization' },
      { status: 500 }
    )
  }
}
