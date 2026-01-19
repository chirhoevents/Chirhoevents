import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_PACKET_SETTINGS = {
  includeSchedule: true,
  includeMap: true,
  includeRoster: true,
  includeHousingAssignments: true,
  includeEmergencyContacts: true,
  includeInvoice: false,
}

// GET: Fetch packet settings for an event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await context.params

    // Verify user has access to this event
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin for the event's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizationId: true,
        settings: {
          select: {
            salvePacketSettings: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify user has access to the organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: event.organizationId,
        userId: user.id,
        role: { in: ['owner', 'admin', 'member'] },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return saved settings or defaults
    const settings = event.settings?.salvePacketSettings || DEFAULT_PACKET_SETTINGS

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching packet settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packet settings' },
      { status: 500 }
    )
  }
}

// PUT: Update packet settings for an event
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await context.params
    const body = await request.json()
    const { settings } = body

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 })
    }

    // Verify user has access to this event
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin for the event's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify user has admin access to the organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: event.organizationId,
        userId: user.id,
        role: { in: ['owner', 'admin'] },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Update or create event settings with packet settings
    const updatedSettings = await prisma.eventSettings.upsert({
      where: { eventId },
      create: {
        eventId,
        salvePacketSettings: settings,
      },
      update: {
        salvePacketSettings: settings,
      },
      select: {
        salvePacketSettings: true,
      },
    })

    return NextResponse.json({
      success: true,
      settings: updatedSettings.salvePacketSettings
    })
  } catch (error) {
    console.error('Error updating packet settings:', error)
    return NextResponse.json(
      { error: 'Failed to update packet settings' },
      { status: 500 }
    )
  }
}
