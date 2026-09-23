import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateFormsCSV } from '@/lib/reports/generate-csv'
import { generateFormsReportPDF } from '@/lib/reports/report-export-pdfs'
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
      '[Forms Export]'
    )
    if (error) return error

    const { format } = await request.json()
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/forms`,
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
      const pdfBuffer = await generateFormsReportPDF(data, eventName)
      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`forms_report_${eventName}.pdf`))
    }

    return new NextResponse(generateFormsCSV(data), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="forms_report.csv"`,
      },
    })
  } catch (error) {
    console.error('[Forms Export] failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
