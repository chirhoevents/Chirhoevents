import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; buildingId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { buildingId } = await params
    const body = await request.json()

    const building = await prisma.building.update({
      where: { id: buildingId },
      data: {
        name: body.name,
        gender: body.gender,
        housingType: body.housingType,
        totalFloors: body.totalFloors,
        notes: body.notes,
      },
    })

    return NextResponse.json(building)
  } catch (error) {
    console.error('Failed to update building:', error)
    return NextResponse.json(
      { message: 'Failed to update building' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; buildingId: string }> }
) {
  try {
    const user = await requireAdmin()
    const { buildingId } = await params

    await prisma.building.delete({
      where: { id: buildingId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete building:', error)
    return NextResponse.json(
      { message: 'Failed to delete building' },
      { status: 500 }
    )
  }
}
