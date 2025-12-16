import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST /api/group-leader/support/message - Send support message
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subject, message, includeContactInfo } = body

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      )
    }

    // Get the group registration for this user
    const groupRegistration = await prisma.groupRegistration.findFirst({
      where: { clerkUserId: userId },
      include: {
        event: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (!groupRegistration) {
      return NextResponse.json(
        { error: 'No group registration found' },
        { status: 404 }
      )
    }

    // TODO: Implement email sending
    // For now, just log the message
    console.log('Support message from:', groupRegistration.groupLeaderEmail)
    console.log('Subject:', subject)
    console.log('Message:', message)
    console.log('Include contact info:', includeContactInfo)
    console.log('Event organizer email:', groupRegistration.event.organization.contactEmail)

    // In a real implementation, you would send an email to:
    // - groupRegistration.event.organization.contactEmail
    // - with the subject and message
    // - optionally including the user's contact info

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent to the event organizers.',
    })
  } catch (error) {
    console.error('Error sending support message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
