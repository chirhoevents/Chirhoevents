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

    const registration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            organizationId: true,
            settings: {
              select: {
                liabilityFormsRequiredIndividual: true,
              },
            },
            organization: {
              select: {
                name: true,
                logoUrl: true,
                contactEmail: true,
                contactPhone: true,
                website: true,
              },
            },
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
      const paymentBalance = await prisma.paymentBalance.findFirst({
        where: { registrationId: registration.id, registrationType: 'individual' },
      })

      return NextResponse.json({
        id: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        qrCode: registration.qrCode,
        housingType: registration.housingType,
        roomType: registration.roomType,
        eventName: registration.event.name,
        totalAmount: paymentBalance?.totalAmountDue || 0,
        amountPaid: paymentBalance?.amountPaid || 0,
        amountRemaining: paymentBalance?.amountRemaining || 0,
        paymentStatus: paymentBalance?.paymentStatus || 'unknown',
        registrationStatus: registration.registrationStatus,
        liabilityFormRequired: registration.event.settings?.liabilityFormsRequiredIndividual || false,
        organizationName: registration.event.organization.name,
        organizationLogoUrl: registration.event.organization.logoUrl,
        organizationContactEmail: registration.event.organization.contactEmail,
        organizationContactPhone: registration.event.organization.contactPhone,
        organizationWebsite: registration.event.organization.website,
      })
    }

    // Stripped public response — NO name, email, QR code, or payment data
    return NextResponse.json({
      id: registration.id,
      eventName: registration.event.name,
      registrationStatus: registration.registrationStatus,
      organizationName: registration.event.organization.name,
      organizationLogoUrl: registration.event.organization.logoUrl,
      organizationContactEmail: registration.event.organization.contactEmail,
      organizationContactPhone: registration.event.organization.contactPhone,
      organizationWebsite: registration.event.organization.website,
      message: `Need help? Contact ${registration.event.organization.name} at ${registration.event.organization.contactEmail || 'the event organizer'}.`,
    })
  } catch (error) {
    console.error('Error fetching individual registration:', error)
    return NextResponse.json(
      { error: 'Failed to load registration' },
      { status: 500 }
    )
  }
}
