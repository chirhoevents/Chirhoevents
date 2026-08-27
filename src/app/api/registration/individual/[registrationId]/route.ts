import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
                contactEmail: true,
                contactPhone: true,
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

    // Prefer the event-specific contact (set on the edit-event page) over the org-level admin contact
    const contactEmail =
      registration.event.settings?.contactEmail || registration.event.organization.contactEmail
    const contactPhone =
      registration.event.settings?.contactPhone || registration.event.organization.contactPhone

    // The registrationId itself (an unguessable UUID) is the access credential here,
    // the same way the confirmation link and QR code are — anyone with the link is
    // the registrant (or someone they shared it with), so we return their own data.
    const paymentBalance = await prisma.paymentBalance.findFirst({
      where: { registrationId: registration.id, registrationType: 'individual' },
    })

    return NextResponse.json({
      id: registration.id,
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      age: registration.age,
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
      organizationContactEmail: contactEmail,
      organizationContactPhone: contactPhone,
      organizationWebsite: registration.event.organization.website,
    })
  } catch (error) {
    console.error('Error fetching individual registration:', error)
    return NextResponse.json(
      { error: 'Failed to load registration' },
      { status: 500 }
    )
  }
}
