import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// PUT - Update a schedule entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; scheduleId: string }> }
) {
  try {
    const { eventId, scheduleId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Poros Schedule Entry]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[PUT Poros Schedule Entry] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, startTime, endTime, title, location } = body

    const entry = await prisma.porosScheduleEntry.update({
      where: { id: scheduleId },
      data: {
        day,
        startTime,
        endTime: endTime || null,
        title,
        location: location || null,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to update schedule entry:', error)
    return NextResponse.json({ error: 'Failed to update schedule entry' }, { status: 500 })
  }
}

// DELETE - Delete a schedule entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; scheduleId: string }> }
) {
  try {
    const { eventId, scheduleId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Schedule Entry]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[DELETE Poros Schedule Entry] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosScheduleEntry.delete({
      where: { id: scheduleId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete schedule entry:', error)
    return NextResponse.json({ error: 'Failed to delete schedule entry' }, { status: 500 })
  }
}
