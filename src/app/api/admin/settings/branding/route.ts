import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgId } from '@/lib/get-effective-org'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { resolveModuleAccess } from '@/lib/subscription-tiers'

export async function GET(request: NextRequest) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        modulesEnabled: true,
        subscriptionTier: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      organization: {
        ...organization,
        primaryColor: organization.primaryColor || '#1E3A5F',
        secondaryColor: organization.secondaryColor || '#9C8466',
        modulesEnabled: resolveModuleAccess(
          organization.modulesEnabled,
          organization.subscriptionTier
        ),
      },
    })
  } catch (error) {
    console.error('Error fetching branding settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Try to get userId from JWT token in Authorization header
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get the effective org ID (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const data = await request.json()

    // Validate colors if provided
    if (data.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use hex format (e.g., #1E3A5F)' },
        { status: 400 }
      )
    }

    if (data.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Use hex format (e.g., #9C8466)' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (data.primaryColor !== undefined) {
      updateData.primaryColor = data.primaryColor
    }

    if (data.secondaryColor !== undefined) {
      updateData.secondaryColor = data.secondaryColor
    }

    // Module access is controlled exclusively from the Master Admin board.
    // Any modulesEnabled in the request body is intentionally ignored here.

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    })

    return NextResponse.json({
      success: true,
      organization,
    })
  } catch (error) {
    console.error('Error updating branding settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
