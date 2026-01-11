import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessCode = searchParams.get('code')

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Find vendor by access code
    const vendor = await prisma.vendorRegistration.findUnique({
      where: { accessCode },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
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
            liabilityForm: {
              select: {
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Format event dates
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    const eventDates = vendor.event.startDate && vendor.event.endDate
      ? `${formatDate(vendor.event.startDate)} - ${formatDate(vendor.event.endDate)}`
      : 'TBD'

    // Calculate balance
    const totalDue = vendor.invoiceTotal ? Number(vendor.invoiceTotal) : 0
    const amountPaid = Number(vendor.amountPaid || 0)
    const balance = totalDue - amountPaid

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        contactFirstName: vendor.contactFirstName,
        contactLastName: vendor.contactLastName,
        email: vendor.email,
        phone: vendor.phone,
        boothDescription: vendor.boothDescription,
        selectedTier: vendor.selectedTier,
        tierPrice: Number(vendor.tierPrice),
        additionalNeeds: vendor.additionalNeeds,
        logoUrl: vendor.logoUrl,
        status: vendor.status,
        rejectionReason: vendor.rejectionReason,
        approvedAt: vendor.approvedAt,
        invoiceLineItems: vendor.invoiceLineItems,
        invoiceTotal: totalDue,
        invoiceNotes: vendor.invoiceNotes,
        paymentStatus: vendor.paymentStatus,
        amountPaid,
        balance,
        paidAt: vendor.paidAt,
        vendorCode: vendor.vendorCode,
        createdAt: vendor.createdAt,
      },
      event: {
        id: vendor.event.id,
        name: vendor.event.name,
        slug: vendor.event.slug,
        dates: eventDates,
      },
      boothStaff: vendor.boothStaff.map(staff => ({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role,
        tshirtSize: staff.tshirtSize,
        checkedIn: staff.checkedIn,
        liabilityStatus: staff.liabilityForm?.status || 'pending',
      })),
    })
  } catch (error) {
    console.error('Error fetching vendor portal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor data' },
      { status: 500 }
    )
  }
}
