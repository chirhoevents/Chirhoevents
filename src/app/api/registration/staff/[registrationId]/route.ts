import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClerkUserIdFromRequest } from '@/lib/jwt-auth-helper'
import { isAdminRole } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params

    const registration = await prisma.staffRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            organizationId: true,
            organization: {
              select: {
                name: true,
                contactEmail: true,
                contactPhone: true,
              },
            },
          },
        },
        vendorRegistration: {
          select: {
            businessName: true,
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Check if caller is authenticated and authorized (admin of the same org)
    const clerkUserId = await getClerkUserIdFromRequest(request)
    let isAuthorized = false

    if (clerkUserId) {
      const user = await prisma.user.findFirst({
        where: { clerkUserId },
        select: { role: true, organizationId: true },
      })
      if (user) {
        const isAdmin = isAdminRole(user.role as any)
        const isMasterAdmin = user.role === 'master_admin'
        isAuthorized = isMasterAdmin || (isAdmin && user.organizationId === registration.event.organizationId)
      }
    }

    if (isAuthorized) {
      // Full response for org admin / master admin
      return NextResponse.json(registration)
    }

    // Stripped public response — NO phone, access code, or vendor data
    return NextResponse.json({
      id: registration.id,
      eventName: registration.event.name,
      registrationStatus: registration.paymentStatus,
      organizationName: registration.event.organization.name,
      organizationContactEmail: registration.event.organization.contactEmail,
      organizationContactPhone: registration.event.organization.contactPhone,
      message: `Need help? Contact ${registration.event.organization.name} at ${registration.event.organization.contactEmail || 'the event organizer'}.`,
    })
  } catch (error) {
    console.error('Error fetching staff registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}
