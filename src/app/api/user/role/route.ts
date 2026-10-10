import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { verifyClerkSessionToken } from '@/lib/jwt-auth-helper'

/**
 * GET /api/user/role
 *
 * Returns the current user's role for routing purposes.
 * Used by the dashboard redirect page to route users to the correct dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    let clerkUserId: string | null = null

    // First try to get userId from Clerk's auth() (uses cookies)
    const authResult = await auth()
    clerkUserId = authResult.userId

    // Fallback: If no userId from auth(), use a verified token from the Authorization header
    // This handles the case where cookies aren't available right after sign-in redirect
    if (!clerkUserId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const verifiedUserId = await verifyClerkSessionToken(token)
        if (verifiedUserId) {
          clerkUserId = verifiedUserId
        }
      }
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user in database by Clerk ID
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    })

    if (!user) {
      // User exists in Clerk but not in database yet
      // This can happen if webhook hasn't processed or user is new
      return NextResponse.json(
        { error: 'User not found', role: 'group_leader' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      role: user.role,
      hasOrganization: !!user.organizationId,
    })
  } catch (error) {
    console.error('Error getting user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
