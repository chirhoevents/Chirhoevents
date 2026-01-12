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
      '[Staff Report]'
    )
    if (error) return error

    const isPreview = request.nextUrl.searchParams.get('preview') === 'true'
    const eventFilter = eventId === 'all' ? {} : { eventId }

    // Get staff registrations
    const staffRegistrations = await prisma.staffRegistration.findMany({
      where: eventFilter,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        vendorRegistration: {
          select: {
            id: true,
            businessName: true,
            vendorCode: true,
          },
        },
        liabilityForm: {
          select: {
            id: true,
            completed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate statistics
    const totalStaff = staffRegistrations.length
    const volunteerStaff = staffRegistrations.filter(s => !s.isVendorStaff).length
    const vendorStaff = staffRegistrations.filter(s => s.isVendorStaff).length

    // Payment statistics
    const paidStaff = staffRegistrations.filter(s => s.paymentStatus === 'paid').length
    const pendingPayment = staffRegistrations.filter(s => s.paymentStatus === 'pending').length

    // Check-in statistics
    const checkedInStaff = staffRegistrations.filter(s => s.checkedIn).length
    const notCheckedIn = totalStaff - checkedInStaff

    // Liability form statistics
    const formsCompleted = staffRegistrations.filter(s => s.liabilityForm?.completed).length
    const formsPending = staffRegistrations.filter(s => s.porosAccessCode && !s.liabilityForm?.completed).length

    // Financial calculations
    const totalRevenue = staffRegistrations.reduce((sum, s) => sum + Number(s.pricePaid || 0), 0)

    if (isPreview) {
      return NextResponse.json({
        totalStaff,
        volunteerStaff,
        vendorStaff,
        checkedInStaff,
      })
    }

    // Role breakdown
    const roleBreakdown: Record<string, number> = {}
    for (const staff of staffRegistrations) {
      const role = staff.role || 'Unknown'
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1
    }

    // T-shirt size breakdown
    const tshirtBreakdown: Record<string, number> = {}
    for (const staff of staffRegistrations) {
      const size = staff.tshirtSize || 'Unknown'
      tshirtBreakdown[size] = (tshirtBreakdown[size] || 0) + 1
    }

    // Detailed staff list
    const staffList = staffRegistrations.map(s => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      email: s.email,
      phone: s.phone,
      role: s.role,
      tshirtSize: s.tshirtSize,
      dietaryRestrictions: s.dietaryRestrictions,
      isVendorStaff: s.isVendorStaff,
      vendorCode: s.vendorCode,
      vendorBusinessName: s.vendorRegistration?.businessName || null,
      pricePaid: Number(s.pricePaid || 0),
      paymentStatus: s.paymentStatus,
      checkedIn: s.checkedIn,
      checkedInAt: s.checkedInAt,
      liabilityFormCompleted: s.liabilityForm?.completed || false,
      porosAccessCode: s.porosAccessCode,
      eventName: s.event.name,
      createdAt: s.createdAt,
    }))

    return NextResponse.json({
      totalStaff,
      volunteerStaff,
      vendorStaff,
      paidStaff,
      pendingPayment,
      checkedInStaff,
      notCheckedIn,
      formsCompleted,
      formsPending,
      totalRevenue,
      roleBreakdown,
      tshirtBreakdown,
      staffList,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate staff report' }, { status: 500 })
  }
}
