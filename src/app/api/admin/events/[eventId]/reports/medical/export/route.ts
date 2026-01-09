import { NextRequest, NextResponse } from 'next/server'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { generateMedicalCSV } from '@/lib/reports/generate-csv'

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const userId = await getClerkUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { format } = await request.json()
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/medical`,
      { headers: { Cookie: request.headers.get('cookie') || '' } }
    )
    if (!reportResponse.ok) throw new Error()

    const data = await reportResponse.json()
    const csv = format === 'csv' ? generateMedicalCSV(data) : 'PDF not implemented'

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="medical_report.${format}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
