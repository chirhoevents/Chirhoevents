import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()

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

    // Get the org admin user for this organization
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

    if (!orgAdmin) {
      return NextResponse.json(
        { error: 'No org admin found for this organization' },
        { status: 404 }
      )
    }

    // Get the organization name
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
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

    cookieStore.set('impersonating_user', orgAdmin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4, // 4 hours
      path: '/',
    })

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
