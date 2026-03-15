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
        event: {
          select: {
            name: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
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
      const payments = await prisma.payment.findMany({
        where: {
          registrationId: registrationId,
          registrationType: 'group',
          paymentStatus: 'succeeded',
        },
        orderBy: { createdAt: 'desc' },
      })

      depositPaid = payments.reduce(
        (sum: number, payment: { amount: any }) => sum + Number(payment.amount),
        0
      )

      const eventPricing = await prisma.eventPricing.findUnique({
        where: { eventId: registration.eventId },
      })

      if (eventPricing) {
        const actualYouthCount = registration.participants.filter(
          (p: { participantType: string }) => p.participantType !== 'chaperone' && p.participantType !== 'priest'
        ).length
        const actualChaperoneCount = registration.participants.filter(
          (p: { participantType: string }) => p.participantType === 'chaperone'
        ).length
        const actualPriestCount = registration.participants.filter(
          (p: { participantType: string }) => p.participantType === 'priest'
        ).length

        totalAmount =
          actualYouthCount * Number(eventPricing.youthRegularPrice) +
          actualChaperoneCount * Number(eventPricing.chaperoneRegularPrice) +
          actualPriestCount * Number(eventPricing.priestPrice)
        balanceRemaining = totalAmount - depositPaid
      }
    }

    if (isAuthorized) {
      // Full response for authenticated + authorized callers
      return NextResponse.json({
        id: registration.id,
        groupName: registration.groupName,
        accessCode: registration.accessCode,
        qrCode: registration.qrCode,
        groupLeaderEmail: registration.groupLeaderEmail,
        totalParticipants: registration.participants.length,
        eventName: registration.event.name,
        eventId: registration.eventId,
        depositPaid,
        totalAmount,
        balanceRemaining,
        registrationStatus: registration.registrationStatus,
        organizationName: registration.event.organization.name,
        organizationLogoUrl: registration.event.organization.logoUrl,
      })
    } else {
      // Stripped public response — no access code, no email, no financial data
      return NextResponse.json({
        id: registration.id,
        groupName: registration.groupName,
        totalParticipants: registration.participants.length,
        eventName: registration.event.name,
        eventId: registration.eventId,
        housingType: registration.housingType,
        registrationStatus: registration.registrationStatus,
        organizationName: registration.event.organization.name,
        organizationLogoUrl: registration.event.organization.logoUrl,
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
