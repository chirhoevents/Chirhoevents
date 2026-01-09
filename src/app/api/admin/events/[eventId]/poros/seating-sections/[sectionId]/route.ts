import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; sectionId: string }> }
) {
  try {
    const { eventId, sectionId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[PUT Seating Section]',
    })
    if (error) return error
    const body = await request.json()

    const section = await prisma.seatingSection.update({
      where: { id: sectionId },
      data: {
        name: body.name,
        sectionCode: body.sectionCode,
        color: body.color,
        capacity: body.capacity,
        locationDescription: body.locationDescription,
        publicVisible: body.publicVisible,
      },
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error('Failed to update seating section:', error)
    return NextResponse.json(
      { message: 'Failed to update seating section' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; sectionId: string }> }
) {
  try {
    const { eventId, sectionId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[DELETE Seating Section]',
    })
    if (error) return error

    await prisma.seatingSection.delete({
      where: { id: sectionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete seating section:', error)
    return NextResponse.json(
      { message: 'Failed to delete seating section' },
      { status: 500 }
    )
  }
}
