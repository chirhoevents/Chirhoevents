import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const rawEventId = searchParams.get('eventId')

    if (!code || !rawEventId) {
      return NextResponse.json(
        { valid: false, error: 'Missing code or eventId' },
        { status: 400 }
      )
    }

    // FIX 2.9: Resolve slug to UUID if needed
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawEventId)
    let eventId = rawEventId
    if (!isUuid) {
      const event = await prisma.event.findUnique({
        where: { slug: rawEventId },
        select: { id: true },
      })
      if (!event) {
        return NextResponse.json({ valid: false, error: 'Event not found' })
      }
      eventId = event.id
    }

    const vendorRegistration = await prisma.vendorRegistration.findFirst({
      where: {
        vendorCode: code.toUpperCase(),
        eventId,
        status: 'approved',
      },
      select: {
        id: true,
        businessName: true,
        status: true,
      },
    })

    if (!vendorRegistration) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid vendor code or vendor not approved',
      })
    }

    return NextResponse.json({
      valid: true,
      businessName: vendorRegistration.businessName,
    })
  } catch (error) {
    console.error('Vendor code validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}
