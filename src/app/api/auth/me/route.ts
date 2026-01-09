import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth Me] Request received')

    // Try to get userId from JWT token first, then fall back to cookie auth
    let userId: string | null = await getClerkUserIdFromHeader(request)

    if (!userId) {
      const authResult = await auth()
      userId = authResult.userId
    }

    console.log('[Auth Me] Clerk userId:', userId)

    if (!userId) {
      console.error('[Auth Me] No userId from Clerk')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    console.log('[Auth Me] User:', {
      email: user?.email,
      role: user?.role,
      org: user?.organization?.name,
    })

    if (!user) {
      console.error('[Auth Me] User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('[Auth Me] Returning user data')
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
    })
  } catch (error) {
    console.error('[Auth Me] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
