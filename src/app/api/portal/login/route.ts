import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_code } = body

    if (!access_code) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Find the group registration by access code
    const groupRegistration = await prisma.groupRegistration.findUnique({
      where: { accessCode: access_code },
      include: {
        event: true,
        participants: {
          select: {
            id: true,
            liabilityFormCompleted: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'Invalid access code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Calculate forms completed
    const formsCompleted = groupRegistration.participants.filter(
      (p: { liabilityFormCompleted: boolean }) => p.liabilityFormCompleted
    ).length
    const formsPending = groupRegistration.totalParticipants - formsCompleted

    // Format event dates
    const startDate = new Date(groupRegistration.event.startDate)
    const endDate = new Date(groupRegistration.event.endDate)
    const eventDates = `${startDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })} - ${endDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })}`

    return NextResponse.json({
      success: true,
      groupId: groupRegistration.id,
      groupName: groupRegistration.groupName,
      eventName: groupRegistration.event.name,
      eventDates,
      totalParticipants: groupRegistration.totalParticipants,
      formsCompleted,
      formsPending,
    })
  } catch (error) {
    console.error('Portal login error:', error)
    return NextResponse.json(
      { error: 'Failed to validate access code. Please try again.' },
      { status: 500 }
    )
  }
}
