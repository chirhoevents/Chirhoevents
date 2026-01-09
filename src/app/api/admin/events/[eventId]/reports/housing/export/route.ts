import { NextRequest, NextResponse } from 'next/server'
import { verifyPorosAccess } from '@/lib/api-auth'
import { generateHousingCSV } from '@/lib/reports/generate-csv'

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
