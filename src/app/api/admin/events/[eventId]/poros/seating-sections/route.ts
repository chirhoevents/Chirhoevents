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
      logPrefix: '[GET Seating Sections]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[GET Seating Sections] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const sections = await prisma.seatingSection.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json(sections)
  } catch (error) {
    console.error('Failed to fetch seating sections:', error)
    return NextResponse.json(
      { message: 'Failed to fetch seating sections' },
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
      logPrefix: '[POST Seating Sections]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Seating Sections] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }
    const body = await request.json()

    const section = await prisma.seatingSection.create({
      data: {
        eventId,
        name: body.name,
        sectionCode: body.sectionCode || null,
        color: body.color || '#1E3A5F',
        capacity: body.capacity || 100,
        locationDescription: body.locationDescription || null,
        publicVisible: body.publicVisible ?? true,
        displayOrder: body.displayOrder || 0,
      },
    })

    return NextResponse.json(section, { status: 201 })
  } catch (error) {
    console.error('Failed to create seating section:', error)
    return NextResponse.json(
      { message: 'Failed to create seating section' },
      { status: 500 }
    )
  }
}
