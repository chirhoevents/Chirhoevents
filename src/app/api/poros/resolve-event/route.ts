import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/poros/resolve-event
 * Given an access_code, returns the eventId for the associated group or individual registration.
 * Used by registrant-facing forms that only have an accessCode but need the eventId
 * to fetch dynamic form config.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_code } = body

    if (!access_code) {
      return NextResponse.json({ error: 'access_code is required' }, { status: 400 })
    }

    const code = String(access_code).trim().toUpperCase()

    // Individual registration (IND- prefix)
    if (code.startsWith('IND-')) {
      const individual = await prisma.individualRegistration.findUnique({
        where: { confirmationCode: code },
        select: { eventId: true, event: { select: { name: true } } },
      })
      if (!individual) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
      }
      return NextResponse.json({ eventId: individual.eventId, eventName: individual.event?.name ?? null })
    }

    // Staff registration (STF- prefix)
    if (code.startsWith('STF-')) {
      const staff = await prisma.staffRegistration.findUnique({
        where: { porosAccessCode: code },
        select: { eventId: true, event: { select: { name: true } } },
      })
      if (!staff) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
      }
      return NextResponse.json({ eventId: staff.eventId, eventName: staff.event?.name ?? null })
    }

    // Vendor registration (VNDPOR- prefix, issued at vendor approval)
    if (code.startsWith('VNDPOR-')) {
      const vendor = await prisma.vendorRegistration.findUnique({
        where: { porosAccessCode: code },
        select: { eventId: true, event: { select: { name: true } } },
      })
      if (!vendor) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
      }
      return NextResponse.json({ eventId: vendor.eventId, eventName: vendor.event?.name ?? null })
    }

    // Group registration
    const group = await prisma.groupRegistration.findUnique({
      where: { accessCode: code },
      select: { eventId: true, event: { select: { name: true } } },
    })
    if (!group) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
    }
    return NextResponse.json({ eventId: group.eventId, eventName: group.event?.name ?? null })
  } catch (error) {
    console.error('Resolve event error:', error)
    return NextResponse.json({ error: 'Failed to resolve event' }, { status: 500 })
  }
}
