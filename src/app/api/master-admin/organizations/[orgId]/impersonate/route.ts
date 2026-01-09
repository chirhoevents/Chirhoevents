import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

    // Get the organization details first
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        modulesEnabled: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get the org admin user for this organization (optional - org might not have one yet)
    const orgAdmin = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        role: 'org_admin',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
      },
    })

    // Set impersonation cookies
    const cookieStore = await cookies()

    // Store the impersonation data in a cookie
    cookieStore.set('impersonating_org', orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4, // 4 hours
      path: '/',
    })

    // Store org admin ID if one exists
    if (orgAdmin) {
      cookieStore.set('impersonating_user', orgAdmin.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 4, // 4 hours
        path: '/',
      })
    }

    cookieStore.set('impersonating_org_name', organization?.name || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4, // 4 hours
      path: '/',
    })

    cookieStore.set('master_admin_id', masterAdmin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4, // 4 hours
      path: '/',
    })

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: masterAdmin.id,
        activityType: 'impersonation_started',
        description: `Master Admin started impersonating "${organization?.name}"`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Now impersonating ${organization?.name}`,
      organizationName: organization?.name,
      logoUrl: organization?.logoUrl,
      modulesEnabled: organization?.modulesEnabled || { poros: true, salve: true, rapha: true },
      redirectUrl: '/dashboard/admin',
    })
  } catch (error) {
    console.error('Impersonate error:', error)
    return NextResponse.json(
      { error: 'Failed to impersonate organization' },
      { status: 500 }
    )
  }
}

// Exit impersonation
export async function DELETE(
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
    const cookieStore = await cookies()

    // Clear impersonation cookies
    cookieStore.delete('impersonating_org')
    cookieStore.delete('impersonating_user')
    cookieStore.delete('impersonating_org_name')
    cookieStore.delete('master_admin_id')

    // Log activity
    await prisma.platformActivityLog.create({
      data: {
        organizationId: orgId,
        userId: masterAdmin.id,
        activityType: 'impersonation_ended',
        description: `Master Admin stopped impersonating organization`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Impersonation ended',
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
