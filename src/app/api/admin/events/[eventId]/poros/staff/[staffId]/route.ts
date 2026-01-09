import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; staffId: string }> }
) {
  try {
    const { eventId, staffId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT /api/admin/events/[eventId]/poros/staff/[staffId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Staff] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
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
    const { eventId, staffId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE /api/admin/events/[eventId]/poros/staff/[staffId]]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Staff] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

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
