import { NextRequest, NextResponse } from 'next/server'
import { verifyPorosAccess } from '@/lib/api-auth'
import { generateHousingCSV } from '@/lib/reports/generate-csv'
import { generateHousingReportPDF } from '@/lib/reports/report-export-pdfs'
import { pdfResponseInit } from '@/lib/reports/generate-table-report-pdf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify Poros access (requires poros.access permission for housing reports)
    const { error, user, event, effectiveOrgId } = await verifyPorosAccess(
      request,
      eventId,
      '[Housing Export]'
    )
    if (error) return error

    const { format } = await request.json()
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/housing`,
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
      const pdfBuffer = await generateHousingReportPDF(data, eventName)
      return new NextResponse(new Uint8Array(pdfBuffer), pdfResponseInit(`housing_report_${eventName}.pdf`))
    }

    return new NextResponse(generateHousingCSV(data), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="housing_report.csv"`,
      },
    })
  } catch (error) {
    console.error('[Housing Export] failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
