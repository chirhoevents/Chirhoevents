import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[GET /api/admin/events/[eventId]/poros/staff]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Staff] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url)
    const types = searchParams.get('type')?.split(',')

    const staff = await prisma.porosStaff.findMany({
      where: {
        eventId,
        ...(types ? { staffType: { in: types as any } } : {}),
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST /api/admin/events/[eventId]/poros/staff]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Staff] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
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
