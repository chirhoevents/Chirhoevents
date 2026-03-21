import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { generateCSV } from '@/lib/reports/generate-csv'

// FIX 4.15: Check-in export endpoint
// GET /api/admin/events/[eventId]/reports/check-in/export
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, event } = await verifyReportAccess(request, eventId, '[Check-In Export]')
    if (error) return error

    // Fetch group participant check-in data
    const participants = await prisma.participant.findMany({
      where: {
        groupRegistration: { eventId },
        checkedIn: true,
      },
      select: {
        firstName: true,
        lastName: true,
        checkedIn: true,
        checkedInAt: true,
        checkInStation: true,
        groupRegistration: {
          select: {
            groupName: true,
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    })

    // Fetch individual registrant check-in data
    const individuals = await prisma.individualRegistration.findMany({
      where: {
        eventId,
        checkedIn: true,
      },
      select: {
        firstName: true,
        lastName: true,
        checkedIn: true,
        checkedInAt: true,
        checkInStation: true,
      },
      orderBy: { checkedInAt: 'asc' },
    })

    const rows: any[] = []

    for (const p of participants) {
      rows.push({
        'Name': `${p.firstName} ${p.lastName}`,
        'Registration Type': 'Group Participant',
        'Group Name': p.groupRegistration?.groupName || '',
        'Checked In': p.checkedIn ? 'Yes' : 'No',
        'Check-In Time': p.checkedInAt
          ? new Date(p.checkedInAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
          : '',
        'Station': p.checkInStation || '',
      })
    }

    for (const ind of individuals) {
      rows.push({
        'Name': `${ind.firstName} ${ind.lastName}`,
        'Registration Type': 'Individual',
        'Group Name': '',
        'Checked In': ind.checkedIn ? 'Yes' : 'No',
        'Check-In Time': ind.checkedInAt
          ? new Date(ind.checkedInAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
          : '',
        'Station': ind.checkInStation || '',
      })
    }

    const eventName = event?.name || eventId
    const csv = generateCSV(rows, [
      'Name',
      'Registration Type',
      'Group Name',
      'Checked In',
      'Check-In Time',
      'Station',
    ])

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="check_in_${eventName.replace(/\s+/g, '_')}.csv"`,
      },
    })
  } catch (error) {
    console.error('[Check-In Export] Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
