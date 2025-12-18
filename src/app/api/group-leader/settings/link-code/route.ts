import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST /api/group-leader/settings/link-code - Link a new access code to user account
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let accessCode: string
    try {
      const body = await request.json()
      accessCode = body.accessCode
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Normalize the access code
    const normalizedCode = accessCode.trim().toUpperCase()
    console.log('Looking up access code:', normalizedCode)

    // Find the group registration with this access code
    let groupRegistration
    try {
      groupRegistration = await prisma.groupRegistration.findUnique({
        where: { accessCode: normalizedCode },
        include: {
          event: true,
        },
      })
    } catch (error) {
      console.error('Database query failed:', error)
      return NextResponse.json(
        { error: 'Database error while looking up access code' },
        { status: 500 }
      )
    }

    console.log('Group registration found:', groupRegistration ? 'Yes' : 'No')

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Invalid access code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Check if this code is already linked to this user
    if (groupRegistration.clerkUserId === userId) {
      return NextResponse.json(
        { error: 'This access code is already linked to your account.' },
        { status: 400 }
      )
    }

    // Check if this code is already linked to another user
    if (groupRegistration.clerkUserId) {
      return NextResponse.json(
        { error: 'This access code is already linked to another account.' },
        { status: 400 }
      )
    }

    // Link the access code to this user
    console.log('Updating group registration with userId:', userId)
    let updatedRegistration
    try {
      updatedRegistration = await prisma.groupRegistration.update({
        where: { id: groupRegistration.id },
        data: {
          clerkUserId: userId,
        },
        include: {
          event: true,
        },
      })
      console.log('Successfully updated registration')
    } catch (error) {
      console.error('Database update failed:', error)
      return NextResponse.json(
        { error: 'Database error while linking access code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Access code linked successfully!',
      registration: {
        id: updatedRegistration.id,
        eventId: updatedRegistration.eventId,
        accessCode: updatedRegistration.accessCode,
        eventName: updatedRegistration.event.name,
        eventDates: `${new Date(updatedRegistration.event.startDate).toLocaleDateString()} - ${new Date(updatedRegistration.event.endDate).toLocaleDateString()}`,
        groupName: updatedRegistration.groupName,
        linkedAt: updatedRegistration.createdAt,
      },
    })
  } catch (error) {
    console.error('Error linking access code:', error)

    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: 'Failed to link access code',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
