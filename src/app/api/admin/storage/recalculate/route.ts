import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth-utils'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'
import { recalculateOrgStorage, getOrgStorageInfo } from '@/lib/storage/track-storage'
import { getEffectiveOrgId } from '@/lib/get-effective-org'

/**
 * POST /api/admin/storage/recalculate
 * Recalculate storage usage for an organization from all stored files
 * Useful for initial migration or correcting drift
 *
 * Body (optional):
 * - organizationId: specific org to recalculate (master admin only)
 *
 * If no organizationId provided, recalculates for the current user's organization
 */
export async function POST(request: NextRequest) {
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let organizationId: string

    // Check if a specific organization was requested
    const body = await request.json().catch(() => ({}))

    if (body.organizationId) {
      // Only master admins can recalculate for other organizations
      if (!hasRole(user, 'master_admin')) {
        return NextResponse.json(
          { error: 'Only master admins can recalculate storage for other organizations' },
          { status: 403 }
        )
      }
      organizationId = body.organizationId
    } else {
      // Use the effective org (handles impersonation)
      organizationId = await getEffectiveOrgId(user as any)
    }

    // Recalculate storage
    const result = await recalculateOrgStorage(organizationId)

    // Get updated storage info
    const storageInfo = await getOrgStorageInfo(organizationId)

    return NextResponse.json({
      success: true,
      organizationId,
      totalBytes: result.totalBytes.toString(),
      totalGb: result.totalGb,
      storageInfo,
    })
  } catch (error) {
    console.error('Error recalculating storage:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate storage' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/storage/recalculate
 * Get current storage info for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const overrideUserId = getClerkUserIdFromHeader(request)
    const user = await getCurrentUser(overrideUserId)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the effective org (handles impersonation)
    const organizationId = await getEffectiveOrgId(user as any)

    const storageInfo = await getOrgStorageInfo(organizationId)

    return NextResponse.json({
      success: true,
      organizationId,
      ...storageInfo,
    })
  } catch (error) {
    console.error('Error getting storage info:', error)
    return NextResponse.json(
      { error: 'Failed to get storage info' },
      { status: 500 }
    )
  }
}
