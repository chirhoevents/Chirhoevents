import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const registration = await prisma.groupRegistration.findUnique({
      where: { id: params.registrationId },
      include: {
        event: true,
        payments: {
          where: { paymentStatus: 'succeeded' },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Calculate totals
    const depositPaid = registration.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
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

    const youthTotal =
      registration.youthCountMaleU18 +
      registration.youthCountFemaleU18 +
      registration.youthCountMaleO18 +
      registration.youthCountFemaleO18

    const chaperoneTotal =
      registration.chaperoneCountMale + registration.chaperoneCountFemale

    const totalAmount =
      youthTotal * Number(eventPricing.youthRegularPrice) +
      chaperoneTotal * Number(eventPricing.chaperoneRegularPrice) +
      registration.priestCount * Number(eventPricing.priestPrice)

    const balanceRemaining = totalAmount - depositPaid

    return NextResponse.json({
      id: registration.id,
      groupName: registration.groupName,
      accessCode: registration.accessCode,
      groupLeaderEmail: registration.groupLeaderEmail,
      totalParticipants: registration.totalParticipants,
      eventName: registration.event.name,
      depositPaid,
      totalAmount,
      balanceRemaining,
      registrationStatus: registration.registrationStatus,
    })
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}
