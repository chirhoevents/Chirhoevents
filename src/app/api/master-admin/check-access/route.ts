import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// API route for checking master admin access

// Decode JWT payload to extract user ID when cookies aren't available
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

export async function GET(request: NextRequest) {
  try {
    let clerkUserId: string | null = null

    // Try to get userId from Clerk's auth (works when cookies are established)
    const authResult = await auth()
    clerkUserId = authResult.userId

    // Fallback: try to get userId from Authorization header (JWT token)
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

    // Get user and check if they are a master admin
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a master admin
    if (user.role !== 'master_admin') {
      return NextResponse.json(
        { error: 'Access denied. Master Admin privileges required.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Master admin access check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
