import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Check if eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
        organizationId: true,
        settings: {
          select: {
            staffRegistrationEnabled: true,
            staffVolunteerPrice: true,
            vendorStaffPrice: true,
            staffRoles: true,
            vendorRegistrationEnabled: true,
            vendorTiers: true,
            liabilityFormsRequiredGroup: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields and format response
    const staffRoles = event.settings?.staffRoles as string[] | null
    const vendorTiers = event.settings?.vendorTiers as Array<{
      id: string
      name: string
      price: string
      description: string
      active: boolean
      quantityLimit: string
    }> | null

    return NextResponse.json({
      id: event.id,
      name: event.name,
      slug: event.slug,
      startDate: event.startDate,
      endDate: event.endDate,
      organizationId: event.organizationId,
      settings: {
        staffRegistrationEnabled: event.settings?.staffRegistrationEnabled || false,
        staffVolunteerPrice: Number(event.settings?.staffVolunteerPrice || 0),
        vendorStaffPrice: Number(event.settings?.vendorStaffPrice || 0),
        staffRoles: staffRoles || [
          'Registration Desk',
          'Setup Crew',
          'Kitchen Staff',
          'Security',
          'Emcee',
          'General Volunteer',
        ],
        vendorRegistrationEnabled: event.settings?.vendorRegistrationEnabled || false,
        vendorTiers: vendorTiers || [],
        liabilityFormsRequiredGroup: event.settings?.liabilityFormsRequiredGroup || false,
      },
    })
  } catch (error) {
    console.error('Error fetching staff/vendor settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event settings' },
      { status: 500 }
    )
  }
}
