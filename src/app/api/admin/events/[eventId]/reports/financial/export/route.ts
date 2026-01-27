import { NextRequest, NextResponse } from 'next/server'
import { verifyFinancialReportAccess } from '@/lib/api-auth'
import { generateFinancialCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialReportPDF } from '@/lib/reports/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    console.log('[Financial Export] Starting export for event:', eventId)

    // Verify financial report access (requires reports.view_financial permission)
    const { error, event } = await verifyFinancialReportAccess(
      request,
      eventId,
      '[Financial Export]'
    )
    if (error) return error

    const { format } = await request.json()
    console.log('[Financial Export] Format requested:', format)

    // Fetch report data from the financial endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    console.log('[Financial Export] Fetching from:', `${baseUrl}/api/admin/events/${eventId}/reports/financial`)

    const reportResponse = await fetch(
      `${baseUrl}/api/admin/events/${eventId}/reports/financial`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text()
      console.error('[Financial Export] Failed to fetch report data:', reportResponse.status, errorText)
      return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
    }

    const reportData = await reportResponse.json()
    console.log('[Financial Export] Report data received:', {
      totalRevenue: reportData.totalRevenue,
      amountPaid: reportData.amountPaid,
      hasError: !!reportData.error,
    })

    // Check if response contains an error
    if (reportData.error) {
      console.error('[Financial Export] Report data contains error:', reportData.error)
      return NextResponse.json({ error: reportData.error }, { status: 500 })
    }

    const eventName = event?.name || 'Event'

    if (format === 'csv') {
      const csv = generateFinancialCSV(reportData)
      console.log('[Financial Export] CSV generated, length:', csv.length)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial_report_${eventName.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      console.log('[Financial Export] Starting PDF generation...')
      const pdfElement = FinancialReportPDF({ reportData, eventName })
      const pdfBuffer = await renderToBuffer(pdfElement)
      console.log('[Financial Export] PDF generated, size:', pdfBuffer.length, 'bytes')

      if (!pdfBuffer || pdfBuffer.length < 100) {
        console.error('[Financial Export] PDF buffer too small:', pdfBuffer?.length)
        return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
      }

      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="financial_report_${eventName.replace(/\s+/g, '_')}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('[Financial Export] Error:', error)
    return NextResponse.json({ error: 'Export failed: ' + String(error) }, { status: 500 })
  }
}
