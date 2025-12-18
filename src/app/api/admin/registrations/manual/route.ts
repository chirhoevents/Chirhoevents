import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database to verify org admin role
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      include: { organization: true },
    })

    if (!user || user.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { eventId, organizationId, registrationType, ...fields } = body

    // Verify event belongs to user's organization
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId: user.organizationId },
      include: { pricing: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (registrationType === 'individual') {
      // Create individual registration
      const registration = await prisma.individualRegistration.create({
        data: {
          eventId,
          organizationId: user.organizationId,
          firstName: fields.firstName || 'N/A',
          lastName: fields.lastName || 'N/A',
          email: fields.email || `manual-${Date.now()}@placeholder.com`,
          phone: fields.phone || 'N/A',
          age: fields.age ? parseInt(fields.age) : null,
          gender: fields.gender || null,
          street: fields.street || null,
          city: fields.city || null,
          state: fields.state || null,
          zip: fields.zip || null,
          housingType: fields.housingType || 'on_campus',
          dietaryRestrictions: fields.dietaryRestrictions || null,
          adaAccommodations: fields.adaAccommodations || null,
          emergencyContact1Name: 'N/A',
          emergencyContact1Phone: 'N/A',
          registrationStatus: 'complete',
        },
      })

      // Calculate price based on housing type
      let price = event.pricing?.youthRegularPrice || 0
      if (fields.housingType === 'on_campus' && event.pricing?.onCampusYouthPrice) {
        price = event.pricing.onCampusYouthPrice
      } else if (fields.housingType === 'off_campus' && event.pricing?.offCampusYouthPrice) {
        price = event.pricing.offCampusYouthPrice
      } else if (fields.housingType === 'day_pass' && event.pricing?.dayPassYouthPrice) {
        price = event.pricing.dayPassYouthPrice
      }

      // Create payment balance
      await prisma.paymentBalance.create({
        data: {
          eventId,
          organizationId: user.organizationId,
          registrationId: registration.id,
          registrationType: 'individual',
          totalAmountDue: price,
          amountPaid: 0,
          amountRemaining: price,
          paymentStatus: 'unpaid',
        },
      })

      return NextResponse.json({ success: true, registration })
    } else {
      // Create group registration
      const youthCount = fields.youthCount ? parseInt(fields.youthCount) : 0
      const chaperoneCount = fields.chaperoneCount ? parseInt(fields.chaperoneCount) : 0
      const priestCount = fields.priestCount ? parseInt(fields.priestCount) : 0
      const totalParticipants = youthCount + chaperoneCount + priestCount

      const registration = await prisma.groupRegistration.create({
        data: {
          eventId,
          organizationId: user.organizationId,
          groupName: fields.groupName || 'Manual Group',
          parishName: fields.parishName || null,
          groupLeaderName: fields.groupLeaderName || 'N/A',
          groupLeaderEmail: fields.groupLeaderEmail || `manual-group-${Date.now()}@placeholder.com`,
          groupLeaderPhone: fields.groupLeaderPhone || 'N/A',
          groupLeaderStreet: fields.street || null,
          groupLeaderCity: fields.city || null,
          groupLeaderState: fields.state || null,
          groupLeaderZip: fields.zip || null,
          alternativeContact1Name: fields.alternativeContact1Name || null,
          alternativeContact1Email: fields.alternativeContact1Email || null,
          alternativeContact1Phone: fields.alternativeContact1Phone || null,
          housingType: fields.housingType || 'on_campus',
          totalParticipants,
          youthCount,
          chaperoneCount,
          priestCount,
          accessCode: `MANUAL-${Date.now()}`,
          specialRequests: fields.specialRequests || null,
          registrationStatus: 'complete',
        },
      })

      // Create payment balance with $0 (will be updated when participants are added)
      await prisma.paymentBalance.create({
        data: {
          eventId,
          organizationId: user.organizationId,
          registrationId: registration.id,
          registrationType: 'group',
          totalAmountDue: 0,
          amountPaid: 0,
          amountRemaining: 0,
          paymentStatus: 'paid_full',
        },
      })

      return NextResponse.json({ success: true, registration })
    }
  } catch (error) {
    console.error('Error creating manual registration:', error)
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    )
  }
}
