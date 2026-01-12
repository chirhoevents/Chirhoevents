import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateStaffCSV } from '@/lib/reports/generate-csv'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error, event } = await verifyReportAccess(
      request,
      eventId,
      '[Staff Export]'
    )
    if (error) return error

    const { format } = await request.json()

    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/staff`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!reportResponse.ok) throw new Error('Failed to fetch report data')

    const reportData = await reportResponse.json()
    const eventName = event?.name || 'Event'

    if (format === 'csv') {
      const csv = generateStaffCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="staff_report_${eventName.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      // For PDF, return a simple text-based summary for now
      const pdfContent = `
Staff Report - ${eventName}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Staff: ${reportData.totalStaff}
Volunteers: ${reportData.volunteerStaff}
Vendor Staff: ${reportData.vendorStaff}
Total Revenue: $${reportData.totalRevenue.toFixed(2)}

CHECK-IN STATUS
---------------
Checked In: ${reportData.checkedInStaff}
Not Checked In: ${reportData.notCheckedIn}

LIABILITY FORMS
---------------
Completed: ${reportData.formsCompleted}
Pending: ${reportData.formsPending}

ROLE BREAKDOWN
--------------
${Object.entries(reportData.roleBreakdown || {}).map(([role, count]) =>
  `${role}: ${count}`
).join('\n') || 'No roles'}

T-SHIRT SIZES
-------------
${Object.entries(reportData.tshirtBreakdown || {}).map(([size, count]) =>
  `${size}: ${count}`
).join('\n') || 'No sizes'}

STAFF LIST
----------
${reportData.staffList?.map((s: any) =>
  `${s.fullName} - ${s.role} - ${s.isVendorStaff ? 'Vendor' : 'Volunteer'} - ${s.checkedIn ? 'Checked In' : 'Not Checked In'}`
).join('\n') || 'No staff'}
      `.trim()

      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="staff_report_${eventName.replace(/\s+/g, '_')}.txt"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
