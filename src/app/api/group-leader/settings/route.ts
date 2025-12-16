import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET /api/group-leader/settings - Get user preferences
export async function GET(request: NextRequest) {
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
      include: {
        event: true,
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    // Get user preferences or create default ones
    let preferences = await prisma.userPreferences.findUnique({
      where: { clerkUserId: userId },
    })

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.userPreferences.create({
        data: {
          clerkUserId: userId,
          groupRegistrationId: groupRegistration.id,
        },
      })
    }

    // Also return user info from group registration
    const userInfo = {
      name: groupRegistration.groupLeaderName,
      email: groupRegistration.groupLeaderEmail,
      phone: groupRegistration.groupLeaderPhone,
      groupName: groupRegistration.groupName,
      parishName: groupRegistration.parishName,
      dioceseName: groupRegistration.dioceseName,
      accessCode: groupRegistration.accessCode,
      eventName: groupRegistration.event.name,
      memberSince: groupRegistration.createdAt,
    }

    return NextResponse.json({
      preferences,
      userInfo,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/group-leader/settings - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

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

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { clerkUserId: userId },
      update: body,
      create: {
        clerkUserId: userId,
        groupRegistrationId: groupRegistration.id,
        ...body,
      },
    })

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
