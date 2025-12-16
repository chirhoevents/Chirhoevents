import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET /api/group-leader/settings - Get user preferences and all linked registrations
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all group registrations for this user
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { clerkUserId: userId },
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (groupRegistrations.length === 0) {
      return NextResponse.json(
        { error: 'No group registrations found' },
        { status: 404 }
      )
    }

    // Use the first (most recent) registration for user info
    const primaryRegistration = groupRegistrations[0]

    // Get user preferences or create default ones
    let preferences = await prisma.userPreferences.findUnique({
      where: { clerkUserId: userId },
    })

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.userPreferences.create({
        data: {
          clerkUserId: userId,
          groupRegistrationId: primaryRegistration.id,
        },
      })
    }

    // Build user info from primary registration
    const userInfo = {
      name: primaryRegistration.groupLeaderName,
      email: primaryRegistration.groupLeaderEmail,
      phone: primaryRegistration.groupLeaderPhone,
      groupName: primaryRegistration.groupName,
      parishName: primaryRegistration.parishName,
      dioceseName: primaryRegistration.dioceseName,
      memberSince: primaryRegistration.createdAt,
    }

    // Build linked events info
    const linkedEvents = groupRegistrations.map((reg) => ({
      id: reg.id,
      accessCode: reg.accessCode,
      eventName: reg.event.name,
      eventDates: `${new Date(reg.event.startDate).toLocaleDateString()} - ${new Date(reg.event.endDate).toLocaleDateString()}`,
      groupName: reg.groupName,
      linkedAt: reg.createdAt,
    }))

    return NextResponse.json({
      preferences,
      userInfo,
      linkedEvents,
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

    // Get any group registration for this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
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
