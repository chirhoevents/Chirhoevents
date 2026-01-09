import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const impersonatingOrg = cookieStore.get('impersonating_org')?.value
    const impersonatingOrgName = cookieStore.get('impersonating_org_name')?.value
    const masterAdminId = cookieStore.get('master_admin_id')?.value

    if (!impersonatingOrg || !masterAdminId) {
      return NextResponse.json({
        isImpersonating: false,
      })
    }

    // Verify the current user is still the master admin who started impersonation
    const masterAdmin = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!masterAdmin || masterAdmin.id !== masterAdminId || masterAdmin.role !== 'master_admin') {
      return NextResponse.json({
        isImpersonating: false,
      })
    }

    return NextResponse.json({
      isImpersonating: true,
      organizationId: impersonatingOrg,
      organizationName: impersonatingOrgName || 'Organization',
    })
  } catch (error) {
    console.error('Error checking impersonation status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Exit impersonation (simpler endpoint that doesn't need orgId)
export async function DELETE(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserIdFromRequest(request)

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const impersonatingOrg = cookieStore.get('impersonating_org')?.value
    const masterAdminId = cookieStore.get('master_admin_id')?.value

    // Verify the current user is the master admin
    const masterAdmin = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true, role: true },
    })

    if (!masterAdmin || masterAdmin.id !== masterAdminId || masterAdmin.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Clear impersonation cookies
    cookieStore.delete('impersonating_org')
    cookieStore.delete('impersonating_user')
    cookieStore.delete('impersonating_org_name')
    cookieStore.delete('master_admin_id')

    // Log activity if we have an org
    if (impersonatingOrg) {
      await prisma.platformActivityLog.create({
        data: {
          organizationId: impersonatingOrg,
          userId: masterAdmin.id,
          activityType: 'impersonation_ended',
          description: `Master Admin stopped impersonating organization`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      redirectUrl: '/dashboard/master-admin',
    })
  } catch (error) {
    console.error('Exit impersonation error:', error)
    return NextResponse.json(
      { error: 'Failed to exit impersonation' },
      { status: 500 }
    )
  }
}
