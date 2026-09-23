import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateCertificatesCSV } from '@/lib/reports/generate-csv'
import { generateCertificatesReportPDF } from '@/lib/reports/report-export-pdfs'
import { pdfResponseInit } from '@/lib/reports/generate-table-report-pdf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, user, event, effectiveOrgId } = await verifyReportAccess(
      request,
      eventId,
      '[Certificates Export]'
    )
    if (error) return error

    const { format } = await request.json()
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/certificates`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
          Authorization: request.headers.get('authorization') || '',
        },
      }
    )
    if (!reportResponse.ok) throw new Error()

    const data = await reportResponse.json()
    const eventName = event?.name || 'Event'

    if (format === 'pdf') {
      const pdfBuffer = await generateCertificatesReportPDF(data, eventName)
      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`certificates_report_${eventName}.pdf`))
    }

    return new NextResponse(generateCertificatesCSV(data), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="certificates_report.csv"`,
      },
    })
  } catch (error) {
    console.error('[Certificates Export] failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
