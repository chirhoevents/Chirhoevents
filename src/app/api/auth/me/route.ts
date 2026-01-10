import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getClerkUserIdFromHeader } from '@/lib/jwt-auth-helper'

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth Me] Request received')

    // Get userId from Authorization header as fallback (for client-side requests)
    const overrideUserId = getClerkUserIdFromHeader(request)
    console.log('[Auth Me] Override userId from header:', overrideUserId || 'none')

    // Use getCurrentUser for consistent auth handling across all routes
    const user = await getCurrentUser(overrideUserId)

    if (!user) {
      console.error('[Auth Me] User not found - either not authenticated or not in database')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('[Auth Me] User found:', {
      email: user.email,
      role: user.role,
      org: user.organization?.name,
    })

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
