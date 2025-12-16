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

    console.log('Fetching settings for user:', userId)

    // Get all group registrations for this user
    let groupRegistrations
    try {
      groupRegistrations = await prisma.groupRegistration.findMany({
        where: { clerkUserId: userId },
        include: {
          event: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      console.log('Found', groupRegistrations.length, 'group registrations')
    } catch (error) {
      console.error('Error fetching group registrations:', error)
      return NextResponse.json(
        { error: 'Database error while fetching registrations' },
        { status: 500 }
      )
    }

    if (groupRegistrations.length === 0) {
      return NextResponse.json(
        { error: 'No group registrations found' },
        { status: 404 }
      )
    }

    // Use the first (most recent) registration for user info
    const primaryRegistration = groupRegistrations[0]

    // Get user preferences or create default ones (optional - may not exist yet)
    let preferences = null
    try {
      preferences = await prisma.userPreferences.findUnique({
        where: { clerkUserId: userId },
      })

      if (!preferences) {
        // Try to create default preferences
        try {
          preferences = await prisma.userPreferences.create({
            data: {
              clerkUserId: userId,
              groupRegistrationId: primaryRegistration.id,
            },
          })
          console.log('Created default preferences')
        } catch (createError) {
          console.warn('Could not create preferences (table may not exist yet):', createError)
          // Continue without preferences - this is not critical
        }
      }
    } catch (error) {
      console.warn('Error accessing userPreferences table (may not exist yet):', error)
      // Continue without preferences - this is not critical
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
      preferences: preferences || {}, // Return empty object if no preferences
      userInfo,
      linkedEvents,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error details:', {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: 'Failed to load settings',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
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

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Get any group registration for this user
    let groupRegistration
    try {
      groupRegistration = await prisma.groupRegistration.findFirst({
        where: { clerkUserId: userId },
      })
    } catch (error) {
      console.error('Error fetching group registration:', error)
      return NextResponse.json(
        { error: 'Database error while fetching registration' },
        { status: 500 }
      )
    }

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    // Upsert preferences
    let preferences
    try {
      preferences = await prisma.userPreferences.upsert({
        where: { clerkUserId: userId },
        update: body,
        create: {
          clerkUserId: userId,
          groupRegistrationId: groupRegistration.id,
          ...body,
        },
      })
    } catch (error) {
      console.error('Error upserting preferences:', error)
      return NextResponse.json(
        { error: 'Database error while saving preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    console.error('Error updating settings:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error details:', {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: 'Failed to update settings',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
