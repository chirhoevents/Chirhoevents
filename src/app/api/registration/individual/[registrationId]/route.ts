import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const { registrationId } = params

    const registration = await prisma.individualRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            settings: {
              select: {
                liabilityFormsRequiredIndividual: true,
              },
            },
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

    // Get payment balance to determine payment status
    const paymentBalance = await prisma.paymentBalance.findFirst({
      where: {
        registrationId: registration.id,
        registrationType: 'individual',
      },
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
      paymentStatus: paymentBalance?.paymentStatus || 'unknown',
      registrationStatus: registration.registrationStatus,
      liabilityFormRequired: registration.event.settings?.liabilityFormsRequiredIndividual || false,
      organizationName: registration.event.organization.name,
      organizationLogoUrl: registration.event.organization.logoUrl,
    })
  } catch (error) {
    console.error('Error fetching individual registration:', error)
    return NextResponse.json(
      { error: 'Failed to load registration' },
      { status: 500 }
    )
  }
}
