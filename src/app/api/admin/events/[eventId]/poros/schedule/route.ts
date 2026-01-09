import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'

// GET - List all schedule entries for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let schedule: any[] = []
    try {
      schedule = await prisma.porosScheduleEntry.findMany({
        where: { eventId },
        orderBy: [{ day: 'asc' }, { order: 'asc' }, { startTime: 'asc' }]
      })
    } catch (error) {
      console.error('Schedule table might not exist:', error)
    }

    // Also get the PDF if it exists
    let pdf = null
    try {
      pdf = await prisma.porosSchedulePdf.findUnique({
        where: { eventId }
      })
    } catch {
      // Table might not exist
    }

    return NextResponse.json({ schedule, pdf })
  } catch (error) {
    console.error('Failed to fetch schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

// POST - Create a new schedule entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { day, dayDate, startTime, endTime, title, location, description, order } = body

    if (!day || !startTime || !title) {
      return NextResponse.json(
        { error: 'Day, start time, and title are required' },
        { status: 400 }
      )
    }

    // Get max order for the day
    const maxOrder = await prisma.porosScheduleEntry.aggregate({
      where: { eventId: eventId, day },
      _max: { order: true }
    })

    const entry = await prisma.porosScheduleEntry.create({
      data: {
        eventId: eventId,
        day,
        dayDate: dayDate ? new Date(dayDate) : null,
        startTime,
        endTime: endTime || null,
        title,
        location: location || null,
        description: description || null,
        order: order ?? (maxOrder._max.order ?? 0) + 1
      }
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Failed to create schedule entry:', error)
    return NextResponse.json({ error: 'Failed to create schedule entry' }, { status: 500 })
  }
}

// PUT - Bulk update schedule entries
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entries, pdfUrl, pdfFilename } = body

    // Update entries if provided
    if (Array.isArray(entries)) {
      // Delete existing entries for this event
      await prisma.porosScheduleEntry.deleteMany({
        where: { eventId: eventId }
      })

      // Create new entries
      if (entries.length > 0) {
        await prisma.porosScheduleEntry.createMany({
          data: entries.map((e: any, index: number) => ({
            eventId: eventId,
            day: e.day,
            dayDate: e.dayDate ? new Date(e.dayDate) : null,
            startTime: e.startTime,
            endTime: e.endTime || null,
            title: e.title,
            location: e.location || null,
            description: e.description || null,
            order: e.order ?? index
          }))
        })
      }
    }

    // Update PDF if provided
    if (pdfUrl !== undefined) {
      if (pdfUrl) {
        await prisma.porosSchedulePdf.upsert({
          where: { eventId: eventId },
          create: {
            eventId: eventId,
            url: pdfUrl,
            filename: pdfFilename || 'schedule.pdf'
          },
          update: {
            url: pdfUrl,
            filename: pdfFilename || 'schedule.pdf'
          }
        })
      } else {
        // Delete PDF if url is null/empty
        try {
          await prisma.porosSchedulePdf.delete({
            where: { eventId: eventId }
          })
        } catch {
          // Ignore if doesn't exist
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update schedule:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

// DELETE - Delete all schedule entries
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.porosScheduleEntry.deleteMany({
      where: { eventId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete schedule:', error)
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
