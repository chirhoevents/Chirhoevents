import { NextRequest, NextResponse } from 'next/server'
import { verifyRaphaAccess } from '@/lib/api-auth'
import { generateMedicalCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { MedicalReportPDF, prepareMedicalPDFData } from '@/lib/reports/pdf-generator'

// Deep sanitize function to ensure all values are primitives (matches financial/registration exports)
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
      console.error('[Medical Export] Found React element in data, skipping')
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
    console.log('[Medical Export] Starting export for event:', eventId)

    const { error, user, event, effectiveOrgId } = await verifyRaphaAccess(
      request,
      eventId,
      '[Medical Export]'
    )
    if (error) return error

    const { format } = await request.json()
    console.log('[Medical Export] Format requested:', format)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const reportResponse = await fetch(
      `${baseUrl}/api/admin/events/${eventId}/reports/medical`,
      { headers: { Cookie: request.headers.get('cookie') || '' } }
    )

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text()
      console.error('[Medical Export] Failed to fetch report data:', reportResponse.status, errorText)
      return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
    }

    const rawData = await reportResponse.json()
    console.log('[Medical Export] Raw data received, keys:', Object.keys(rawData))

    if (rawData.error) {
      console.error('[Medical Export] Report data contains error:', rawData.error)
      return NextResponse.json({ error: rawData.error }, { status: 500 })
    }

    const eventName = String(event?.name || 'Event')

    if (format === 'pdf') {
      try {
        // Step 1: Sanitize raw data (removes React elements, Decimals, etc.)
        const sanitizedData = sanitizeForPDF(rawData)
        console.log('[Medical Export] Data sanitized')

        // Step 2: Pre-process into student-consolidated format
        const pdfData = prepareMedicalPDFData(sanitizedData)
        console.log('[Medical Export] PDF data prepared, students:', pdfData.students.length)

        // Step 3: Sanitize again after processing to be safe
        const finalData = sanitizeForPDF(pdfData)
        console.log('[Medical Export] Final sanitization done')

        // Step 4: Call component function directly (same pattern as Financial)
        const pdfElement = MedicalReportPDF({ reportData: finalData, eventName })
        console.log('[Medical Export] PDF element created, calling renderToBuffer...')

        const pdfBuffer = await renderToBuffer(pdfElement)
        console.log('[Medical Export] PDF generated, size:', pdfBuffer.length, 'bytes')

        if (!pdfBuffer || pdfBuffer.length < 100) {
          console.error('[Medical Export] PDF buffer too small:', pdfBuffer?.length)
          return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
        }

        return new NextResponse(Buffer.from(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="medical_report_${eventName.replace(/\s+/g, '_')}.pdf"`,
          },
        })
      } catch (pdfError: any) {
        console.error('[Medical Export] PDF generation error:', pdfError?.message || pdfError)
        console.error('[Medical Export] PDF error stack:', pdfError?.stack)
        return NextResponse.json({ error: 'PDF generation failed: ' + String(pdfError?.message || pdfError) }, { status: 500 })
      }
    }

    const csv = generateMedicalCSV(rawData)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="medical_report_${eventName.replace(/\s+/g, '_')}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[Medical Export] Error:', error?.message || error)
    return NextResponse.json({ error: 'Export failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
