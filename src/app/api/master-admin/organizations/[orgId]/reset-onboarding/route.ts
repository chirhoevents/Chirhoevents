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
    const currentUser = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!currentUser || currentUser.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Master Admin access required' },
        { status: 403 }
      )
    }

    const { orgId } = await params

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Find the current org admin
    const orgAdmin = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        role: 'org_admin',
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!orgAdmin) {
      return NextResponse.json(
        { error: 'No org admin found for this organization' },
        { status: 404 }
      )
    }

    // Strip the Clerk account link so the admin can be re-invited with a new email
    await prisma.user.update({
      where: { id: orgAdmin.id },
      data: { clerkUserId: null },
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: currentUser.id,
        activityType: 'onboarding_reset',
        description: `Onboarding reset for org admin ${orgAdmin.email} — account unlinked so a new invite can be sent`,
        metadata: {
          orgAdminId: orgAdmin.id,
          orgAdminEmail: orgAdmin.email,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding reset successfully. Use "Change Org Admin" or "Resend Onboarding Email" to re-invite with the correct email.',
      orgAdminEmail: orgAdmin.email,
    })
  } catch (error) {
    console.error('Error resetting onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to reset onboarding' },
      { status: 500 }
    )
  }
}
