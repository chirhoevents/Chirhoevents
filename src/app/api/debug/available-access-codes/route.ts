import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Find group registrations that aren't linked to a Clerk user yet
    const availableRegistrations = await prisma.groupRegistration.findMany({
      where: {
        clerkUserId: null,
      },
      include: {
        event: {
          select: {
            name: true,
          },
        },
        participants: {
          select: {
            id: true,
          },
        },
      },
      take: 10,
    })

    const registrations = availableRegistrations.map((reg: any) => ({
      accessCode: reg.accessCode,
      groupName: reg.groupName,
      eventName: reg.event.name,
      participantCount: reg.participants.length,
      leaderEmail: reg.groupLeaderEmail,
    }))

    return NextResponse.json({
      count: registrations.length,
      registrations,
    })
  } catch (error) {
    console.error('Error fetching registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
