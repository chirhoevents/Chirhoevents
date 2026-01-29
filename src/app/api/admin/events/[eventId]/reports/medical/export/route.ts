import React from 'react'
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
      const pdfElement = React.createElement(MedicalReportPDF, {
        reportData: data,
        eventName,
      })
      const pdfBuffer = await renderToBuffer(pdfElement)

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="medical_report.pdf"`,
        },
      })
    }

    const csv = generateMedicalCSV(data)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="medical_report.csv"`,
      },
    })
  } catch (error) {
    console.error('[Medical Export] Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
