import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// FIX 2.11: In-memory rate limiter (5 req/min per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // FIX 2.11: Rate limit — 5 requests per minute per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { message: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ message: 'Search query required' }, { status: 400 })
    }

    // Check if eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    // Check if portal is enabled
    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      include: { settings: true },
    })

    if (!event?.settings?.publicPortalEnabled) {
      return NextResponse.json({ message: 'Portal not available' }, { status: 403 })
    }

    // Parse name into first/last
    const nameParts = query.split(' ').filter(Boolean)
    if (nameParts.length < 2) {
      return NextResponse.json({ message: 'Please enter first and last name' }, { status: 400 })
    }

    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')

    // Search in participants (group registrations)
    const participant = await prisma.participant.findFirst({
      where: {
        groupRegistration: { eventId: event.id },
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
      },
      include: {
        groupRegistration: true,
      },
    })

    // Search in individual registrations if not found
    let individual = null
    if (!participant) {
      individual = await prisma.individualRegistration.findFirst({
        where: {
          eventId: event.id,
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
        },
      })
    }

    if (!participant && !individual) {
      return NextResponse.json({ message: 'Participant not found' }, { status: 404 })
    }

    // Build response
    const response: any = {
      participant: {
        firstName: participant?.firstName || individual?.firstName,
        lastName: participant?.lastName || individual?.lastName,
        gender: participant?.gender || individual?.gender,
        parishName: participant?.groupRegistration?.parishName || null,
      },
    }

    // Get room assignment
    const roomAssignment = await prisma.roomAssignment.findFirst({
      where: participant
        ? { participantId: participant.id }
        : { individualRegistrationId: individual?.id },
      include: {
        room: {
          include: { building: true },
        },
      },
    })

    if (roomAssignment) {
      // Get roommates
      const allRoomAssignments = await prisma.roomAssignment.findMany({
        where: { roomId: roomAssignment.roomId },
      })

      const roommateIds = allRoomAssignments
        .filter((a: any) => {
          if (participant && a.participantId !== participant.id) return true
          if (individual && a.individualRegistrationId !== individual.id) return true
          return false
        })

      // Get roommate names
      const roommates: any[] = []
      for (const a of roommateIds) {
        if (a.participantId) {
          const p = await prisma.participant.findUnique({
            where: { id: a.participantId },
            select: { firstName: true, lastName: true },
          })
          if (p) roommates.push(p)
        } else if (a.individualRegistrationId) {
          const i = await prisma.individualRegistration.findUnique({
            where: { id: a.individualRegistrationId },
            select: { firstName: true, lastName: true },
          })
          if (i) roommates.push(i)
        }
      }

      // FIX 2.11: Truncate roommate names to first name + last initial only
      const truncatedRoommates = roommates.map((r: any) => ({
        firstName: r.firstName,
        lastName: r.lastName ? r.lastName.charAt(0) + '.' : '',
      }))

      response.housing = {
        buildingName: roomAssignment.room.building.name,
        roomNumber: roomAssignment.room.roomNumber,
        floor: roomAssignment.room.floor,
        roommates: truncatedRoommates,
      }
    }

    // Get small group assignment
    const sgAssignment = await prisma.smallGroupAssignment.findFirst({
      where: participant
        ? { participantId: participant.id }
        : { individualRegistrationId: individual?.id },
      include: {
        smallGroup: {
          include: { sgl: true },
        },
      },
    })

    if (sgAssignment) {
      response.smallGroup = {
        name: sgAssignment.smallGroup.name,
        groupNumber: sgAssignment.smallGroup.groupNumber,
        meetingTime: sgAssignment.smallGroup.meetingTime,
        meetingPlace: sgAssignment.smallGroup.meetingPlace,
        sgl: sgAssignment.smallGroup.sgl
          ? {
              firstName: sgAssignment.smallGroup.sgl.firstName,
              lastName: sgAssignment.smallGroup.sgl.lastName,
            }
          : null,
      }
    }

    // Get seating assignment
    const seatingAssignment = await prisma.seatingAssignment.findFirst({
      where: participant
        ? { groupRegistrationId: participant.groupRegistrationId }
        : { individualRegistrationId: individual?.id },
      include: { section: true },
    })

    if (seatingAssignment) {
      response.seating = {
        sectionName: seatingAssignment.section.name,
        sectionCode: seatingAssignment.section.sectionCode,
        color: seatingAssignment.section.color,
        locationDescription: seatingAssignment.section.locationDescription,
      }
    }

    // Get meal group assignment
    const mealAssignment = await prisma.mealGroupAssignment.findFirst({
      where: participant
        ? { groupRegistrationId: participant.groupRegistrationId }
        : { individualRegistrationId: individual?.id },
      include: { mealGroup: true },
    })

    if (mealAssignment) {
      response.mealGroup = {
        name: mealAssignment.mealGroup.name,
        color: mealAssignment.mealGroup.color,
        colorHex: mealAssignment.mealGroup.colorHex,
        breakfastTime: mealAssignment.mealGroup.breakfastTime,
        lunchTime: mealAssignment.mealGroup.lunchTime,
        dinnerTime: mealAssignment.mealGroup.dinnerTime,
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to lookup participant:', error)
    return NextResponse.json(
      { message: 'Failed to lookup participant' },
      { status: 500 }
    )
  }
}
