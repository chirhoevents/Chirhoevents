import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET - Get a single coupon
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; couponId: string }> }
) {
  try {
    const { eventId, couponId } = await params

    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET Coupon]',
    })

    if (error) return error
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const coupon = await prisma.coupon.findFirst({
      where: { id: couponId, eventId },
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    return NextResponse.json({
      coupon: {
        ...coupon,
        discountValue: Number(coupon.discountValue),
      },
    })
  } catch (error) {
    console.error('Error fetching coupon:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a coupon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; couponId: string }> }
) {
  try {
    const { eventId, couponId } = await params

    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Coupon]',
    })

    if (error) return error
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const data = await request.json()

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findFirst({
      where: { id: couponId, eventId },
    })

    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // If code is being changed, check for duplicates
    if (data.code && data.code.toUpperCase() !== existingCoupon.code) {
      const duplicateCoupon = await prisma.coupon.findFirst({
        where: {
          code: data.code.toUpperCase(),
          eventId,
          id: { not: couponId },
        },
      })

      if (duplicateCoupon) {
        return NextResponse.json(
          { error: 'A coupon with this code already exists for this event' },
          { status: 400 }
        )
      }
    }

    // Update the coupon
    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        name: data.name ?? existingCoupon.name,
        code: data.code ? data.code.toUpperCase() : existingCoupon.code,
        discountType: data.discountType ?? existingCoupon.discountType,
        discountValue: data.discountValue !== undefined
          ? parseFloat(data.discountValue)
          : existingCoupon.discountValue,
        usageLimitType: data.usageLimitType ?? existingCoupon.usageLimitType,
        maxUses: data.usageLimitType === 'limited' && data.maxUses
          ? parseInt(data.maxUses)
          : data.usageLimitType === 'unlimited' || data.usageLimitType === 'single_use'
            ? null
            : existingCoupon.maxUses,
        isStackable: data.isStackable ?? existingCoupon.isStackable,
        restrictToEmail: data.restrictToEmail !== undefined
          ? (data.restrictToEmail || null)
          : existingCoupon.restrictToEmail,
        expirationDate: data.expirationDate !== undefined
          ? (data.expirationDate ? new Date(data.expirationDate) : null)
          : existingCoupon.expirationDate,
        active: data.active ?? existingCoupon.active,
      },
    })

    return NextResponse.json({
      coupon: {
        ...coupon,
        discountValue: Number(coupon.discountValue),
      },
    })
  } catch (error) {
    console.error('Error updating coupon:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; couponId: string }> }
) {
  try {
    const { eventId, couponId } = await params

    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Coupon]',
    })

    if (error) return error
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findFirst({
      where: { id: couponId, eventId },
    })

    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // Check if coupon has been used
    const redemptionCount = await prisma.couponRedemption.count({
      where: { couponId },
    })

    if (redemptionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete coupon that has been used ${redemptionCount} time(s). Deactivate it instead.` },
        { status: 400 }
      )
    }

    // Delete the coupon
    await prisma.coupon.delete({
      where: { id: couponId },
    })

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
