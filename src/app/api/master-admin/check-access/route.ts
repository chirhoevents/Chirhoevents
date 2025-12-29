import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()

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
