import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST /api/group-leader/settings/reset - Reset preferences to defaults
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the group registration for this user
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { clerkUserId: userId },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    // Delete existing preferences
    await prisma.userPreferences.deleteMany({
      where: { clerkUserId: userId },
    })

    // Create new default preferences
    const preferences = await prisma.userPreferences.create({
      data: {
        clerkUserId: userId,
        groupRegistrationId: groupRegistration.id,
      },
    })

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    console.error('Error resetting settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
