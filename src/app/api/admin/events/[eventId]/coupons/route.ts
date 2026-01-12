import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET - List all coupons for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Coupons]',
    })

    if (error) return error
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const coupons = await prisma.coupon.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    })

    // Convert Decimal to number for JSON serialization
    const serializedCoupons = coupons.map((coupon: { discountValue: unknown; [key: string]: unknown }) => ({
      ...coupon,
      discountValue: Number(coupon.discountValue),
    }))

    return NextResponse.json({ coupons: serializedCoupons })
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new coupon
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user, effectiveOrgId } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Coupon]',
    })

    if (error) return error
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.code || !data.discountValue) {
      return NextResponse.json(
        { error: 'Name, code, and discount value are required' },
        { status: 400 }
      )
    }

    // Check if code already exists for this event
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        code: data.code.toUpperCase(),
        eventId,
      },
    })

    if (existingCoupon) {
      return NextResponse.json(
        { error: 'A coupon with this code already exists for this event' },
        { status: 400 }
      )
    }

    // Create the coupon
    const coupon = await prisma.coupon.create({
      data: {
        organizationId: effectiveOrgId!,
        eventId,
        name: data.name,
        code: data.code.toUpperCase(),
        discountType: data.discountType || 'percentage',
        discountValue: parseFloat(data.discountValue),
        usageLimitType: data.usageLimitType || 'unlimited',
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
        isStackable: data.isStackable || false,
        restrictToEmail: data.restrictToEmail || null,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        active: data.active !== false,
        createdByUserId: user.id,
      },
    })

    return NextResponse.json({
      coupon: {
        ...coupon,
        discountValue: Number(coupon.discountValue),
      },
    })
  } catch (error) {
    console.error('Error creating coupon:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
