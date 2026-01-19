import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface ScheduleEntry {
  day: string
  startTime: string
  endTime?: string | null
  title: string
  location?: string | null
}

// POST - Import schedule entries from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[POST Poros Schedule Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      console.error(`[POST Poros Schedule Import] ❌ User ${user!.email} (role: ${user!.role}) lacks poros.access permission`)
      return NextResponse.json(
        { message: 'Forbidden - Poros portal access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { entries, replaceExisting = true } = body as { entries: ScheduleEntry[], replaceExisting?: boolean }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { message: 'No entries provided' },
        { status: 400 }
      )
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.day || !entry.startTime || !entry.title) {
        return NextResponse.json(
          { message: 'Each entry must have day, startTime, and title' },
          { status: 400 }
        )
      }
    }

    // Delete existing entries if replacing
    if (replaceExisting) {
      await prisma.porosScheduleEntry.deleteMany({
        where: { eventId }
      })
    }

    // Group entries by day to calculate order
    const entriesByDay: Record<string, ScheduleEntry[]> = {}
    for (const entry of entries) {
      const day = entry.day.toLowerCase()
      if (!entriesByDay[day]) {
        entriesByDay[day] = []
      }
      entriesByDay[day].push(entry)
    }

    // Create entries with proper order
    const createData = []
    for (const [day, dayEntries] of Object.entries(entriesByDay)) {
      // Sort by start time within each day
      dayEntries.sort((a, b) => {
        const timeA = convertTo24Hour(a.startTime)
        const timeB = convertTo24Hour(b.startTime)
        return timeA.localeCompare(timeB)
      })

      for (let i = 0; i < dayEntries.length; i++) {
        const entry = dayEntries[i]
        createData.push({
          eventId,
          day,
          startTime: entry.startTime,
          endTime: entry.endTime || null,
          title: entry.title,
          location: entry.location || null,
          order: i + 1,
        })
      }
    }

    // Create all entries
    const result = await prisma.porosScheduleEntry.createMany({
      data: createData,
    })

    console.log(`[POST Poros Schedule Import] ✅ Imported ${result.count} schedule entries for event ${eventId}`)

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Imported ${result.count} schedule entries`,
    })
  } catch (error) {
    console.error('Failed to import schedule:', error)
    return NextResponse.json({ message: 'Failed to import schedule' }, { status: 500 })
  }
}

// Helper to convert 12-hour time to 24-hour for sorting
function convertTo24Hour(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return time

  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3]?.toUpperCase()

  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`
}
