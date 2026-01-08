import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * Decode a JWT and extract the payload (without verification)
 * Used as fallback when Clerk cookies aren't available
 */
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

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

    // Fallback: If no userId from auth(), try to decode JWT from Authorization header
    // This handles the case where cookies aren't available right after sign-in redirect
    if (!clerkUserId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const payload = decodeJwtPayload(token)
        if (payload?.sub) {
          clerkUserId = payload.sub
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
