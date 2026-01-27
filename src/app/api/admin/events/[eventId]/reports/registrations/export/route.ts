import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateRegistrationCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { RegistrationReportPDF } from '@/lib/reports/pdf-generator'

// Deep sanitize function to ensure all values are primitives
function sanitizeForPDF(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }

  // Handle primitives
  if (typeof obj === 'string' || typeof obj === 'boolean') {
    return obj
  }

  if (typeof obj === 'number') {
    // Handle NaN and Infinity
    if (!Number.isFinite(obj)) {
      return 0
    }
    return obj
  }

  // Handle BigInt
  if (typeof obj === 'bigint') {
    return Number(obj)
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForPDF(item))
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Check for React elements - they have $$typeof
    if (obj.$$typeof) {
      console.error('[Registration Export] Found React element in data, skipping')
      return null
    }

    // Check for Prisma Decimal
    if (obj.constructor?.name === 'Decimal' || typeof obj.toNumber === 'function') {
      return Number(obj)
    }

    // Recursively sanitize object
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForPDF(value)
    }
    return result
  }

  // Fallback - convert to string
  return String(obj)
}

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

    const rawReportData = await reportResponse.json()
    console.log('[Registration Export] Raw report data received:', {
      totalRegistrations: rawReportData.totalRegistrations,
      groupCount: rawReportData.groupCount,
      hasError: !!rawReportData.error,
      demographicsType: typeof rawReportData.demographics,
      topGroupsLength: rawReportData.topGroups?.length,
    })

    // Check if response contains an error
    if (rawReportData.error) {
      console.error('[Registration Export] Report data contains error:', rawReportData.error)
      return NextResponse.json({ error: rawReportData.error }, { status: 500 })
    }

    // Sanitize the data to ensure no non-primitive values
    const reportData = sanitizeForPDF(rawReportData)
    console.log('[Registration Export] Sanitized report data:', {
      totalRegistrations: reportData.totalRegistrations,
      groupCount: reportData.groupCount,
    })

    const eventName = String(event?.name || 'Event')

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
      console.log('[Registration Export] Starting PDF generation with sanitized data...')
      console.log('[Registration Export] Demographics keys:', Object.keys(reportData?.demographics || {}))
      console.log('[Registration Export] Top groups sample:', reportData?.topGroups?.slice(0, 2))

      try {
        // Call the component function directly - it returns a <Document> element
        const pdfElement = RegistrationReportPDF({ reportData, eventName })
        console.log('[Registration Export] PDF element created, calling renderToBuffer...')

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
      } catch (pdfError: any) {
        console.error('[Registration Export] PDF generation error:', pdfError?.message || pdfError)
        console.error('[Registration Export] PDF error stack:', pdfError?.stack)
        return NextResponse.json({ error: 'PDF generation failed: ' + String(pdfError?.message || pdfError) }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error: any) {
    console.error('[Registration Export] Error:', error?.message || error)
    return NextResponse.json({ error: 'Export failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
