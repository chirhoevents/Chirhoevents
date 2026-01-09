import { NextRequest, NextResponse } from 'next/server'
import { verifyFinancialReportAccess } from '@/lib/api-auth'
import { generateFinancialCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinancialReportPDF } from '@/lib/reports/pdf-generator'
import React from 'react'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify financial report access (requires reports.view_financial permission)
    const { error, user, event, effectiveOrgId } = await verifyFinancialReportAccess(
      request,
      eventId,
      '[Financial Export]'
    )
    if (error) return error

    const { format } = await request.json()

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
    const eventName = event!.name || 'Event'

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
      const pdfElement = FinancialReportPDF({ reportData, eventName })
      const pdfBuffer = await renderToBuffer(pdfElement)
      // Convert Buffer to Uint8Array for NextResponse
      const pdfData = new Uint8Array(pdfBuffer)
      return new NextResponse(pdfData, {
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
