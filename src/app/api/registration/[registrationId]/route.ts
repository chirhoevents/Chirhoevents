import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          include: {
            organization: {
              select: {
                name: true,
                logoUrl: true,
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

    // Fetch payments separately (polymorphic relationship)
    const payments = await prisma.payment.findMany({
      where: {
        registrationId: registrationId,
        registrationType: 'group',
        paymentStatus: 'succeeded',
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate totals
    const depositPaid = payments.reduce(
      (sum: number, payment: { amount: any }) => sum + Number(payment.amount),
      0
    )

    const eventPricing = await prisma.eventPricing.findUnique({
      where: { eventId: registration.eventId },
    })

    if (!eventPricing) {
      return NextResponse.json(
        { error: 'Event pricing not found' },
        { status: 404 }
      )
    }

    const totalAmount =
      registration.youthCount * Number(eventPricing.youthRegularPrice) +
      registration.chaperoneCount * Number(eventPricing.chaperoneRegularPrice) +
      registration.priestCount * Number(eventPricing.priestPrice)

    const balanceRemaining = totalAmount - depositPaid

    return NextResponse.json({
      id: registration.id,
      groupName: registration.groupName,
      accessCode: registration.accessCode,
      qrCode: registration.qrCode,
      groupLeaderEmail: registration.groupLeaderEmail,
      totalParticipants: registration.totalParticipants,
      eventName: registration.event.name,
      eventId: registration.eventId,
      depositPaid,
      totalAmount,
      balanceRemaining,
      registrationStatus: registration.registrationStatus,
      organizationName: registration.event.organization.name,
      organizationLogoUrl: registration.event.organization.logoUrl,
    })
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}
