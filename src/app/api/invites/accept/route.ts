import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = auth()

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'You must be signed in to accept an invite' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { inviteId } = body

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    // Find the pending invite (user without clerkUserId)
    const pendingUser = await prisma.user.findFirst({
      where: {
        id: inviteId,
        clerkUserId: null, // Only match if not already claimed
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Check if this Clerk user already has an account
    const existingUser = await prisma.user.findFirst({
      where: { clerkUserId },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'You already have an account. Please sign in with your existing account.' },
        { status: 400 }
      )
    }

    // Link the Clerk user to the pending invite
    const updatedUser = await prisma.user.update({
      where: { id: inviteId },
      data: {
        clerkUserId,
        lastLogin: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Welcome to ${pendingUser.organization.name}!`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
      },
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

// GET - validate invite without accepting
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('inviteId')

  if (!inviteId) {
    return NextResponse.json(
      { error: 'Invite ID is required' },
      { status: 400 }
    )
  }

  const pendingUser = await prisma.user.findFirst({
    where: {
      id: inviteId,
      clerkUserId: null,
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!pendingUser) {
    return NextResponse.json(
      { valid: false, error: 'Invalid or expired invitation' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    valid: true,
    invite: {
      firstName: pendingUser.firstName,
      lastName: pendingUser.lastName,
      email: pendingUser.email,
      organizationName: pendingUser.organization.name,
      role: pendingUser.role,
    },
  })
}
