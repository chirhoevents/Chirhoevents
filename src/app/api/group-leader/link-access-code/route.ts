import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { accessCode } = await req.json()

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Find the group registration by access code
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { accessCode: accessCode.toUpperCase() },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          }
        }
      }
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 404 }
      )
    }

    // Check if this access code is already linked to another user
    if (groupRegistration.clerkUserId && groupRegistration.clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'This access code is already linked to another account' },
        { status: 409 }
      )
    }

    // Check if this access code is already linked to this user
    if (groupRegistration.clerkUserId === userId) {
      return NextResponse.json({
        success: true,
        message: 'Access code already linked to your account',
        groupId: groupRegistration.id,
        groupName: groupRegistration.groupName,
        eventName: groupRegistration.event.name,
      })
    }

    // Link the access code to this Clerk user
    await prisma.groupRegistration.update({
      where: { id: groupRegistration.id },
      data: {
        clerkUserId: userId,
        dashboardLastAccessedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Access code linked successfully',
      groupId: groupRegistration.id,
      groupName: groupRegistration.groupName,
      eventName: groupRegistration.event.name,
    })
  } catch (error) {
    console.error('Error linking access code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
