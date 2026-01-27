import { NextRequest, NextResponse } from 'next/server'
import { verifyFinancialReportAccess } from '@/lib/api-auth'
import { generateFinancialCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialReportPDF } from '@/lib/reports/pdf-generator'

// Deep sanitize function to ensure all values are primitives
function sanitizeForPDF(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }

  if (typeof obj === 'string' || typeof obj === 'boolean') {
    return obj
  }

  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) {
      return 0
    }
    return obj
  }

  if (typeof obj === 'bigint') {
    return Number(obj)
  }

  if (obj instanceof Date) {
    return obj.toISOString()
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForPDF(item))
  }

  if (typeof obj === 'object') {
    if (obj.$$typeof) {
      console.error('[Financial Export] Found React element in data, skipping')
      return null
    }

    if (obj.constructor?.name === 'Decimal' || typeof obj.toNumber === 'function') {
      return Number(obj)
    }

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForPDF(value)
    }
    return result
  }

  return String(obj)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    console.log('[Financial Export] Starting export for event:', eventId)

    const { error, event } = await verifyFinancialReportAccess(
      request,
      eventId,
      '[Financial Export]'
    )
    if (error) return error

    const { format } = await request.json()
    console.log('[Financial Export] Format requested:', format)

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

    const rawReportData = await reportResponse.json()
    console.log('[Financial Export] Raw report data received:', {
      totalRevenue: rawReportData.totalRevenue,
      amountPaid: rawReportData.amountPaid,
      hasError: !!rawReportData.error,
    })

    if (rawReportData.error) {
      console.error('[Financial Export] Report data contains error:', rawReportData.error)
      return NextResponse.json({ error: rawReportData.error }, { status: 500 })
    }

    const reportData = sanitizeForPDF(rawReportData)
    const eventName = String(event?.name || 'Event')

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
      console.log('[Financial Export] Starting PDF generation with sanitized data...')

      try {
        // Call the component function directly - it returns a <Document> element
        const pdfElement = FinancialReportPDF({ reportData, eventName })
        console.log('[Financial Export] PDF element created, calling renderToBuffer...')

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
      } catch (pdfError: any) {
        console.error('[Financial Export] PDF generation error:', pdfError?.message || pdfError)
        return NextResponse.json({ error: 'PDF generation failed: ' + String(pdfError?.message || pdfError) }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error: any) {
    console.error('[Financial Export] Error:', error?.message || error)
    return NextResponse.json({ error: 'Export failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
