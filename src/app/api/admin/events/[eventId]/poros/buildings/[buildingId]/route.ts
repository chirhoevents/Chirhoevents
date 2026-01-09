import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; buildingId: string }> }
) {
  try {
    const { eventId, buildingId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Building]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Building] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
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
    const { eventId, buildingId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Building]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Building] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

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
