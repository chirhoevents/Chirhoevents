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
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        groupName: true,
        accessCode: true,
        qrCode: true,
        groupLeaderEmail: true,
        housingType: true,
        registrationStatus: true,
        eventId: true,
        clerkUserId: true,
        totalParticipants: true,
        event: {
          select: {
            name: true,
            organizationId: true,
            pricing: {
              select: { fullPaymentDeadline: true },
            },
            settings: {
              select: {
                contactEmail: true,
                contactPhone: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                contactEmail: true,
                contactPhone: true,
              },
            },
          },
        },
        participants: {
          select: {
            id: true,
            participantType: true,
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

    // Fix #3: Determine if the caller is authenticated and authorized
    const clerkUserId = await getClerkUserIdFromRequest(request)
    let isAuthorized = false

    if (clerkUserId) {
      const user = await prisma.user.findFirst({
        where: { clerkUserId },
        select: { id: true, role: true, organizationId: true },
      })

      if (user) {
        const isAdmin = isAdminRole(user.role as any)
        const isMasterAdmin = user.role === 'master_admin'
        const isOrgAdmin = isAdmin && user.organizationId === registration.event.organizationId
        const isOwner = registration.clerkUserId === clerkUserId

        isAuthorized = isMasterAdmin || isOrgAdmin || isOwner
      }
    }

    // Fetch payments — only needed for authenticated full response
    let depositPaid = 0
    let totalAmount = 0
    let balanceRemaining = 0

    if (isAuthorized) {
      // FIX 2.5: Use PaymentBalance which already has the correct totals (including discounts)
      const paymentBalance = await prisma.paymentBalance.findFirst({
        where: { registrationId, registrationType: 'group' },
      })

      if (paymentBalance) {
        totalAmount = Number(paymentBalance.totalAmountDue)
        depositPaid = Number(paymentBalance.amountPaid)
        balanceRemaining = Number(paymentBalance.amountRemaining)
      } else {
        // Fallback: sum succeeded payments
        const payments = await prisma.payment.findMany({
          where: { registrationId, registrationType: 'group', paymentStatus: 'succeeded' },
        })
        depositPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
        balanceRemaining = 0
      }
    }

    // Prefer the event-specific contact (set on the edit-event page) over the org-level admin contact
    const contactEmail =
      registration.event.settings?.contactEmail || registration.event.organization.contactEmail
    const contactPhone =
      registration.event.settings?.contactPhone || registration.event.organization.contactPhone

    if (isAuthorized) {
      // Full response for authenticated + authorized callers
      return NextResponse.json({
        id: registration.id,
        groupName: registration.groupName,
        accessCode: registration.accessCode,
        qrCode: registration.qrCode,
        groupLeaderEmail: registration.groupLeaderEmail,
        totalParticipants: registration.totalParticipants || 0,
        eventName: registration.event.name,
        eventId: registration.eventId,
        depositPaid,
        totalAmount,
        balanceRemaining,
        fullPaymentDeadline: registration.event.pricing?.fullPaymentDeadline ?? null,
        registrationStatus: registration.registrationStatus,
        organizationName: registration.event.organization.name,
        organizationLogoUrl: registration.event.organization.logoUrl,
        organizationContactEmail: contactEmail,
        organizationContactPhone: contactPhone,
      })
    } else {
      // Stripped public response — no access code, no email, no financial data
      return NextResponse.json({
        id: registration.id,
        groupName: registration.groupName,
        totalParticipants: registration.totalParticipants || 0,
        eventName: registration.event.name,
        eventId: registration.eventId,
        housingType: registration.housingType,
        registrationStatus: registration.registrationStatus,
        organizationName: registration.event.organization.name,
        organizationLogoUrl: registration.event.organization.logoUrl,
        organizationContactEmail: contactEmail,
        organizationContactPhone: contactPhone,
      })
    }
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}
