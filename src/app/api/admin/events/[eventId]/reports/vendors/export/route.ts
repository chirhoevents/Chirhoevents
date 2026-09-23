import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateVendorCSV } from '@/lib/reports/generate-csv'
import { generateVendorReportPDF } from '@/lib/reports/report-export-pdfs'
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
      '[Vendor Export]'
    )
    if (error) return error

    const { format } = await request.json()

    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/vendors`,
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
      const csv = generateVendorCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vendor_report_${eventName.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      const pdfBuffer = await generateVendorReportPDF(reportData, eventName)
      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`vendor_report_${eventName}.pdf`))
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
