import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { staffId } = await params
    const body = await request.json()

    const staff = await prisma.porosStaff.update({
      where: { id: staffId },
      data: {
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

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Failed to update staff:', error)
    return NextResponse.json(
      { message: 'Failed to update staff' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { staffId } = await params

    await prisma.porosStaff.delete({
      where: { id: staffId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete staff:', error)
    return NextResponse.json(
      { message: 'Failed to delete staff' },
      { status: 500 }
    )
  }
}
