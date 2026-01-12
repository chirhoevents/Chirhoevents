import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyReportAccess } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Verify report access (requires reports.view permission)
    const { error } = await verifyReportAccess(
      request,
      eventId,
      '[Vendor Report]'
    )
    if (error) return error

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get vendor registrations
    const vendors = await prisma.vendorRegistration.findMany({
      where: eventFilter,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        boothStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            tshirtSize: true,
            checkedIn: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate statistics
    const totalVendors = vendors.length
    const pendingVendors = vendors.filter(v => v.status === 'pending').length
    const approvedVendors = vendors.filter(v => v.status === 'approved').length
    const rejectedVendors = vendors.filter(v => v.status === 'rejected').length

    // Payment statistics
    const paidVendors = vendors.filter(v => v.paymentStatus === 'paid').length
    const unpaidVendors = vendors.filter(v => v.paymentStatus === 'unpaid').length
    const partialVendors = vendors.filter(v => v.paymentStatus === 'partial').length

    // Financial calculations
    const totalInvoiced = vendors.reduce((sum, v) => sum + Number(v.invoiceTotal || 0), 0)
    const totalPaid = vendors.reduce((sum, v) => sum + Number(v.amountPaid || 0), 0)
    const totalBalance = totalInvoiced - totalPaid

    // Staff count
    const totalBoothStaff = vendors.reduce((sum, v) => sum + v.boothStaff.length, 0)

    if (isPreview) {
      return NextResponse.json({
        totalVendors,
        approvedVendors,
        pendingVendors,
        totalBoothStaff,
      })
    }

    // Tier breakdown
    const tierBreakdown: Record<string, number> = {}
    for (const vendor of vendors) {
      const tier = vendor.selectedTier || 'Unknown'
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1
    }

    // Detailed vendor list
    const vendorList = vendors.map(v => ({
      id: v.id,
      businessName: v.businessName,
      contactName: `${v.contactFirstName} ${v.contactLastName}`,
      email: v.email,
      phone: v.phone,
      selectedTier: v.selectedTier,
      status: v.status,
      paymentStatus: v.paymentStatus,
      invoiceTotal: Number(v.invoiceTotal || 0),
      amountPaid: Number(v.amountPaid || 0),
      balance: Number(v.invoiceTotal || 0) - Number(v.amountPaid || 0),
      vendorCode: v.vendorCode,
      boothStaffCount: v.boothStaff.length,
      boothStaff: v.boothStaff.map(s => ({
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        role: s.role,
        tshirtSize: s.tshirtSize,
        checkedIn: s.checkedIn,
      })),
      eventName: v.event.name,
      createdAt: v.createdAt,
      approvedAt: v.approvedAt,
    }))

    return NextResponse.json({
      totalVendors,
      pendingVendors,
      approvedVendors,
      rejectedVendors,
      paidVendors,
      unpaidVendors,
      partialVendors,
      totalInvoiced,
      totalPaid,
      totalBalance,
      totalBoothStaff,
      tierBreakdown,
      vendorList,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate vendor report' }, { status: 500 })
  }
}
