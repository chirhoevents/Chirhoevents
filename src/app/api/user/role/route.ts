import { NextResponse, NextRequest } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/user/role
 *
 * Returns the current user's role for routing purposes.
 * Used by the dashboard redirect page to route users to the correct dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    let clerkUserId: string | null = null

    // First try to get userId from Clerk's auth()
    const authResult = await auth()
    clerkUserId = authResult.userId

    // If no userId from auth(), try to verify Bearer token from header
    if (!clerkUserId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          // Verify the token with Clerk
          const client = await clerkClient()
          const verifiedToken = await client.verifyToken(token)
          clerkUserId = verifiedToken.sub
        } catch (tokenError) {
          console.error('Token verification failed:', tokenError)
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
