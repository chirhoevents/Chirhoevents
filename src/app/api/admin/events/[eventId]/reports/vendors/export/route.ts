import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { generateVendorCSV } from '@/lib/reports/generate-csv'

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
      '[Vendor Export]'
    )
    if (error) return error

    const { format } = await request.json()

    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/events/${eventId}/reports/vendors`,
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
      const csv = generateVendorCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vendor_report_${eventName.replace(/\s+/g, '_')}.csv"`,
        },
      })
    } else if (format === 'pdf') {
      // For PDF, return a simple text-based summary for now
      // Could be enhanced with @react-pdf/renderer later
      const pdfContent = `
Vendor Report - ${eventName}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Vendors: ${reportData.totalVendors}
Approved: ${reportData.approvedVendors}
Pending: ${reportData.pendingVendors}
Rejected: ${reportData.rejectedVendors}

FINANCIAL
---------
Total Invoiced: $${reportData.totalInvoiced.toFixed(2)}
Total Paid: $${reportData.totalPaid.toFixed(2)}
Balance Due: $${reportData.totalBalance.toFixed(2)}

PAYMENT STATUS
--------------
Paid: ${reportData.paidVendors}
Partial: ${reportData.partialVendors}
Unpaid: ${reportData.unpaidVendors}

Total Booth Staff: ${reportData.totalBoothStaff}

VENDOR LIST
-----------
${reportData.vendorList?.map((v: any) =>
  `${v.businessName} - ${v.contactName} - ${v.status} - $${v.balance.toFixed(2)} balance`
).join('\n') || 'No vendors'}
      `.trim()

      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="vendor_report_${eventName.replace(/\s+/g, '_')}.txt"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
