import { NextRequest, NextResponse } from 'next/server'
import { verifyRaphaAccess } from '@/lib/api-auth'
import { generateMedicalCSV } from '@/lib/reports/generate-csv'
import { generateMedicalPDF } from '@/lib/reports/medical-pdf'

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

    const data = await reportResponse.json()
    console.log('[Medical Export] Data received, keys:', Object.keys(data))

    if (data.error) {
      console.error('[Medical Export] Report data contains error:', data.error)
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    const eventName = String(event?.name || 'Event')

    if (format === 'pdf') {
      try {
        console.log('[Medical Export] Generating PDF with pdfkit...')
        const pdfBuffer = await generateMedicalPDF(data, eventName)
        console.log('[Medical Export] PDF generated, size:', pdfBuffer.length, 'bytes')

        if (!pdfBuffer || pdfBuffer.length < 100) {
          console.error('[Medical Export] PDF buffer too small:', pdfBuffer?.length)
          return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
        }

        return new NextResponse(new Uint8Array(pdfBuffer), {
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

    const csv = generateMedicalCSV(data)
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
