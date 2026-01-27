import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateRegistrationCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { RegistrationReportPDF } from '@/lib/reports/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    console.log('[Registration Export] Starting export for event:', eventId)

    // Verify report access (requires reports.view permission)
    const { error, event } = await verifyReportAccess(
      request,
      eventId,
      '[Registration Export]'
    )
    if (error) return error

    const { format } = await request.json()
    console.log('[Registration Export] Format requested:', format)

    // Fetch report data from the registrations endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    console.log('[Registration Export] Fetching from:', `${baseUrl}/api/admin/events/${eventId}/reports/registrations`)

    const reportResponse = await fetch(
      `${baseUrl}/api/admin/events/${eventId}/reports/registrations`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text()
      console.error('[Registration Export] Failed to fetch report data:', reportResponse.status, errorText)
      return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
    }

    const reportData = await reportResponse.json()
    console.log('[Registration Export] Report data received:', {
      totalRegistrations: reportData.totalRegistrations,
      groupCount: reportData.groupCount,
      hasError: !!reportData.error,
    })

    // Check if response contains an error
    if (reportData.error) {
      console.error('[Registration Export] Report data contains error:', reportData.error)
      return NextResponse.json({ error: reportData.error }, { status: 500 })
    }

    const eventName = event?.name || 'Event'

    if (format === 'csv') {
      const csv = generateRegistrationCSV(reportData)
      console.log('[Registration Export] CSV generated, length:', csv.length)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="registration_report_${eventName.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      console.log('[Registration Export] Starting PDF generation...')
      const pdfElement = RegistrationReportPDF({ reportData, eventName })
      const pdfBuffer = await renderToBuffer(pdfElement)
      console.log('[Registration Export] PDF generated, size:', pdfBuffer.length, 'bytes')

      if (!pdfBuffer || pdfBuffer.length < 100) {
        console.error('[Registration Export] PDF buffer too small:', pdfBuffer?.length)
        return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
      }

      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="registration_report_${eventName.replace(/\s+/g, '_')}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('[Registration Export] Error:', error)
    return NextResponse.json({ error: 'Export failed: ' + String(error) }, { status: 500 })
  }
}
