import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

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
      // If the existing user is orphaned (no organization) or is the same record as the pending invite,
      // we can proceed by clearing the old link
      if (existingUser.id === pendingUser.id) {
        // Same record, proceed with the update (shouldn't normally happen but handle it)
      } else if (!existingUser.organizationId) {
        // Orphaned user record with this clerkUserId - clear it so we can link to the new invite
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { clerkUserId: null },
        })
      } else {
        // User has an active account in another organization
        return NextResponse.json(
          { error: 'This account is already linked to another organization. Please contact support if you need to transfer your account.' },
          { status: 400 }
        )
      }
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
      message: `Welcome to ${pendingUser.organization?.name || 'the organization'}!`,
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

  // First, try to find a pending (unclaimed) invite
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

  if (pendingUser) {
    return NextResponse.json({
      valid: true,
      invite: {
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        email: pendingUser.email,
        organizationName: pendingUser.organization?.name || 'Unknown',
        role: pendingUser.role,
      },
    })
  }

  // If no pending invite, check if this invite was already claimed
  // This handles the case where user signed up and got redirected back
  const { userId: clerkUserId } = await auth()

  if (clerkUserId) {
    // Check if the current user already claimed this invite
    const claimedUser = await prisma.user.findFirst({
      where: {
        id: inviteId,
        clerkUserId: clerkUserId,
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    })

    if (claimedUser) {
      // User already accepted this invite - return success with alreadyAccepted flag
      return NextResponse.json({
        valid: true,
        alreadyAccepted: true,
        invite: {
          firstName: claimedUser.firstName,
          lastName: claimedUser.lastName,
          email: claimedUser.email,
          organizationName: claimedUser.organization?.name || 'Unknown',
          role: claimedUser.role,
        },
      })
    }
  }

  // Neither pending nor claimed by current user - truly invalid
  return NextResponse.json(
    { valid: false, error: 'Invalid or expired invitation' },
    { status: 404 }
  )
}
