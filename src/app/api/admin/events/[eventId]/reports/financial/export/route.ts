import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateFinancialCSV, generateFinancialPDF } from '@/lib/reports/generate-csv'

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

    if (format === 'csv') {
      const csv = generateFinancialCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="financial_report.csv"',
        },
      })
    } else if (format === 'pdf') {
      const pdf = generateFinancialPDF(reportData, 'Event')
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="financial_report.txt"',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
