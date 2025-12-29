import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateHousingCSV } from '@/lib/reports/generate-csv'

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { format } = await request.json()
    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/housing`,
      { headers: { Cookie: request.headers.get('cookie') || '' } }
    )
    if (!reportResponse.ok) throw new Error()

    const data = await reportResponse.json()
    const csv = format === 'csv' ? generateHousingCSV(data) : 'PDF not implemented'

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="housing_report.${format}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
