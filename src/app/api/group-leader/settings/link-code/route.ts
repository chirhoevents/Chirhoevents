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

    const { accessCode } = await request.json()

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Find the group registration with this access code
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { accessCode: accessCode.toUpperCase() },
      include: {
        event: true,
      },
    })

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
    const updatedRegistration = await prisma.groupRegistration.update({
      where: { id: groupRegistration.id },
      data: {
        clerkUserId: userId,
        dashboardLastAccessedAt: new Date(),
      },
      include: {
        event: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Access code linked successfully!',
      registration: {
        id: updatedRegistration.id,
        accessCode: updatedRegistration.accessCode,
        eventName: updatedRegistration.event.name,
        eventDates: `${new Date(updatedRegistration.event.startDate).toLocaleDateString()} - ${new Date(updatedRegistration.event.endDate).toLocaleDateString()}`,
        groupName: updatedRegistration.groupName,
        linkedAt: updatedRegistration.dashboardLastAccessedAt,
      },
    })
  } catch (error) {
    console.error('Error linking access code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
