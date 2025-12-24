import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const types = searchParams.get('type')?.split(',')

    const staff = await prisma.porosStaff.findMany({
      where: {
        eventId,
        ...(types ? { staffType: { in: types } } : {}),
      },
      orderBy: [{ staffType: 'asc' }, { lastName: 'asc' }],
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json(
      { message: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const user = await requireAdmin()
    const { eventId } = params
    const body = await request.json()

    const staff = await prisma.porosStaff.create({
      data: {
        eventId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        staffType: body.staffType,
        gender: body.gender,
        diocese: body.diocese,
        notes: body.notes,
      },
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Failed to create staff:', error)
    return NextResponse.json(
      { message: 'Failed to create staff' },
      { status: 500 }
    )
  }
}
