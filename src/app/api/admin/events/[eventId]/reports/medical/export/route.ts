import { NextRequest, NextResponse } from 'next/server'
import { verifyRaphaAccess } from '@/lib/api-auth'
import { generateMedicalCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { MedicalReportPDF } from '@/lib/reports/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify Rapha access (requires rapha.access permission for medical reports)
    const { error, user, event, effectiveOrgId } = await verifyRaphaAccess(
      request,
      eventId,
      '[Medical Export]'
    )
    if (error) return error

    const { format } = await request.json()
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/medical`,
      { headers: { Cookie: request.headers.get('cookie') || '' } }
    )
    if (!reportResponse.ok) throw new Error()

    const data = await reportResponse.json()
    const eventName = event?.name || 'Event'

    if (format === 'pdf') {
      try {
        // Call the component function directly - it returns a <Document> element
        const pdfElement = MedicalReportPDF({ reportData: data, eventName })
        const pdfBuffer = await renderToBuffer(pdfElement)

        if (!pdfBuffer || pdfBuffer.length < 100) {
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
  } catch (error) {
    console.error('[Medical Export] Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
