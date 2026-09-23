import { NextRequest, NextResponse } from 'next/server'
import { verifyPorosAccess } from '@/lib/api-auth'
import { generateRoomAllocationsCSV } from '@/lib/reports/generate-csv'
import { generateRoomAllocationsReportPDF } from '@/lib/reports/report-export-pdfs'
import { pdfResponseInit } from '@/lib/reports/generate-table-report-pdf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify Poros access
    const { error, event } = await verifyPorosAccess(
      request,
      eventId,
      '[Room Allocations Export]'
    )
    if (error) return error

    const { format, purpose } = await request.json()

    // Build URL with optional purpose filter
    let url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/room-allocations`
    if (purpose) {
      url += `?purpose=${purpose}`
    }

    const reportResponse = await fetch(url, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
        Authorization: request.headers.get('authorization') || '',
      },
    })
    if (!reportResponse.ok) throw new Error('Failed to fetch report data')

    const data = await reportResponse.json()
    const eventName = event?.name || 'Event'

    if (format === 'csv') {
      const csv = generateRoomAllocationsCSV(data)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="room_allocations_report.csv"`,
        },
      })
    } else if (format === 'pdf') {
      const pdfBuffer = await generateRoomAllocationsReportPDF(data, eventName)
      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`room_allocations_${eventName}.pdf`))
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Room allocations export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
