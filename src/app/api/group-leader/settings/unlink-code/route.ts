import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// POST /api/group-leader/settings/unlink-code - Unlink an access code from user account
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { registrationId } = await request.json()

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Find the group registration
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Verify this registration belongs to the current user
    if (groupRegistration.clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to unlink this registration' },
        { status: 403 }
      )
    }

    // Check if this is the user's only registration
    const userRegistrationsCount = await prisma.groupRegistration.count({
      where: { clerkUserId: userId },
    })

    if (userRegistrationsCount === 1) {
      return NextResponse.json(
        { error: 'You cannot unlink your only registration. You must have at least one linked event.' },
        { status: 400 }
      )
    }

    // Unlink the registration (set clerkUserId to null)
    await prisma.groupRegistration.update({
      where: { id: registrationId },
      data: {
        clerkUserId: null,
        dashboardLastAccessedAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Access code unlinked successfully',
    })
  } catch (error) {
    console.error('Error unlinking access code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
