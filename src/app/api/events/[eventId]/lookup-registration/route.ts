import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// FIX 4.11: Registration lookup on public event page.
// Allows someone who lost their confirmation email to find their registration
// by supplying their email address and access/confirmation code.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()
    const codeUpper = code.toUpperCase().trim()

    // Check for UUID (event ID) vs slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)
    let resolvedEventId = eventId
    if (!isUuid) {
      const event = await prisma.event.findUnique({
        where: { slug: eventId },
        select: { id: true },
      })
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      resolvedEventId = event.id
    }

    // Try group registration (email = groupLeaderEmail, code = accessCode)
    const groupReg = await prisma.groupRegistration.findFirst({
      where: {
        eventId: resolvedEventId,
        groupLeaderEmail: { equals: emailLower, mode: 'insensitive' },
        accessCode: codeUpper,
      },
      select: {
        id: true,
        groupName: true,
        groupLeaderName: true,
        registrationStatus: true,
      },
    })

    if (groupReg) {
      return NextResponse.json({
        found: true,
        type: 'group',
        registrationId: groupReg.id,
        name: groupReg.groupLeaderName,
        groupName: groupReg.groupName,
        status: groupReg.registrationStatus,
        // Client uses this to navigate to the group portal
        portalUrl: `/dashboard/group-leader`,
      })
    }

    // Try individual registration (email = email, code = confirmationCode)
    const individualReg = await prisma.individualRegistration.findFirst({
      where: {
        eventId: resolvedEventId,
        email: { equals: emailLower, mode: 'insensitive' },
        confirmationCode: codeUpper,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registrationStatus: true,
      },
    })

    if (individualReg) {
      return NextResponse.json({
        found: true,
        type: 'individual',
        registrationId: individualReg.id,
        name: `${individualReg.firstName} ${individualReg.lastName}`,
        status: individualReg.registrationStatus,
        // Direct link to their confirmation page
        confirmationUrl: `/registration/confirmation/individual/${individualReg.id}`,
      })
    }

    // No match — generic message to avoid email enumeration
    return NextResponse.json(
      { found: false, error: 'No registration found with that email and code combination.' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Lookup Registration] Error:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
