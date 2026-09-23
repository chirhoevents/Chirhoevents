import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateStaffCSV } from '@/lib/reports/generate-csv'
import { generateStaffReportPDF } from '@/lib/reports/report-export-pdfs'
import { pdfResponseInit } from '@/lib/reports/generate-table-report-pdf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, event } = await verifyReportAccess(
      request,
      eventId,
      '[Staff Export]'
    )
    if (error) return error

    const { format } = await request.json()

    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/staff`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
          Authorization: request.headers.get('authorization') || '',
        },
      }
    )

    if (!reportResponse.ok) throw new Error('Failed to fetch report data')

    const reportData = await reportResponse.json()
    const eventName = event?.name || 'Event'

    if (format === 'csv') {
      const csv = generateStaffCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="staff_report_${eventName.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      const pdfBuffer = await generateStaffReportPDF(reportData, eventName)
      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`staff_report_${eventName}.pdf`))
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
