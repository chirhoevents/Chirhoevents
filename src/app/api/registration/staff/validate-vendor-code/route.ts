import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const eventId = searchParams.get('eventId')

    if (!code || !eventId) {
      return NextResponse.json(
        { valid: false, error: 'Missing code or eventId' },
        { status: 400 }
      )
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
