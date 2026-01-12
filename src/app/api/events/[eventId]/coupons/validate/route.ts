import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Validate a coupon code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const data = await request.json()
    const { code, email } = data

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    // Check if eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

    // Fetch the event
    const event = await prisma.event.findUnique({
      where: isUuid ? { id: eventId } : { slug: eventId },
      select: { id: true, settings: { select: { couponsEnabled: true } } },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if coupons are enabled for this event
    if (!event.settings?.couponsEnabled) {
      return NextResponse.json(
        { valid: false, error: 'Coupons are not enabled for this event' },
        { status: 400 }
      )
    }

    // Find the coupon
    const coupon = await prisma.coupon.findFirst({
      where: {
        eventId: event.id,
        code: code.toUpperCase(),
      },
    })

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: 'Invalid coupon code' },
        { status: 200 }
      )
    }

    // Check if coupon is active
    if (!coupon.active) {
      return NextResponse.json(
        { valid: false, error: 'This coupon is no longer active' },
        { status: 200 }
      )
    }

    // Check expiration date
    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has expired' },
        { status: 200 }
      )
    }

    // Check usage limits
    if (coupon.usageLimitType === 'single_use' && coupon.usageCount >= 1) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has already been used' },
        { status: 200 }
      )
    }

    if (coupon.usageLimitType === 'limited' && coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has reached its usage limit' },
        { status: 200 }
      )
    }

    // Check email restriction
    if (coupon.restrictToEmail && email) {
      if (coupon.restrictToEmail.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { valid: false, error: 'This coupon is restricted to a specific email address' },
          { status: 200 }
        )
      }
    }

    // Coupon is valid
    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        isStackable: coupon.isStackable,
      },
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
