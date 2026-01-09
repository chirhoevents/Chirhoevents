import { NextRequest, NextResponse } from 'next/server'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { generateRegistrationCSV } from '@/lib/reports/generate-csv'
import { renderToBuffer } from '@react-pdf/renderer'
import { RegistrationReportPDF } from '@/lib/reports/pdf-generator'
import React from 'react'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { format } = await request.json()
    const { eventId } = await params

    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/registrations`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!reportResponse.ok) throw new Error('Failed')

    const reportData = await reportResponse.json()

    // Get event name
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
      const csv = generateRegistrationCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="registration_report.csv"',
        },
      })
    } else if (format === 'pdf') {
      // Generate actual PDF using @react-pdf/renderer
      const pdfElement = RegistrationReportPDF({ reportData, eventName })
      const pdfBuffer = await renderToBuffer(pdfElement)
      // Convert Buffer to Uint8Array for NextResponse
      const pdfData = new Uint8Array(pdfBuffer)
      return new NextResponse(pdfData, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="registration_report.pdf"',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
