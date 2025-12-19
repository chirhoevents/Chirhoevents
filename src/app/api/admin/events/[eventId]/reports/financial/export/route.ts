import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateFinancialCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialReportPDF } from '@/lib/reports/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { format } = await request.json()
    const { eventId } = params

    // Fetch the report data
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/financial`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!reportResponse.ok) {
      throw new Error('Failed to fetch report data')
    }

    const reportData = await reportResponse.json()

    // Get event name from the API
    const eventResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )
    const event = eventResponse.ok ? await eventResponse.json() : { name: 'Event' }
    const eventName = event.name || 'Event'

    if (format === 'csv') {
      const csv = generateFinancialCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="financial_report.csv"',
        },
      })
    } else if (format === 'pdf') {
      // Generate actual PDF using @react-pdf/renderer
      const pdfBuffer = await renderToBuffer(
        <FinancialReportPDF reportData={reportData} eventName={eventName} />
      )
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="financial_report.pdf"',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
