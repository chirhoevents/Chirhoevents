import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

// PUT - Update a confession time entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; confessionId: string }> }
) {
  try {
    const { eventId, confessionId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Poros Confession Time]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { day, startTime, endTime, location, confessor } = body

    const entry = await prisma.porosConfessionTime.update({
      where: { id: confessionId },
      data: {
        day,
        startTime,
        endTime: endTime || null,
        location: location || null,
        confessor: confessor || null,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to update confession time:', error)
    return NextResponse.json({ error: 'Failed to update confession time' }, { status: 500 })
  }
}

// DELETE - Delete a confession time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; confessionId: string }> }
) {
  try {
    const { eventId, confessionId } = await params
    const { error, user } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Poros Confession Time]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    await prisma.porosConfessionTime.delete({
      where: { id: confessionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete confession time:', error)
    return NextResponse.json({ error: 'Failed to delete confession time' }, { status: 500 })
  }
}
